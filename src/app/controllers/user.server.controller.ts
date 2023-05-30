import {Request, Response} from "express";
import * as users from '../models/user.server.model';
import Logger from "../../config/logger";
import * as schemas from '../resources/schemas.json';
import * as passwordHash from '../controllers/password.hash';
import * as validator from "./validator";
import {uid} from 'rand-token';


const register = async (req: Request, res: Response): Promise<void> => {
    const validation = await validator.validate(schemas.user_register, req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }

    const email = req.body.email;
    const firstname = req.body.firstName;
    const lastName = req.body.lastName;
    const password = await passwordHash.hash(req.body.password);

    try {
        const result = await users.register(email, firstname, lastName, password);
        const userResult = {userId: result.insertId};
        res.statusMessage = 'Created';
        res.status(201).send(userResult);
        return;
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.statusMessage = 'Forbidden. Email already in use';
            res.status(403).send();
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
        }
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    const validation = await validator.validate(schemas.user_login, req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }
    try {
        const email = req.body.email;
        const password = req.body.password;
        const checkEmailInDB = await users.checkEmailInDB(email);
        if (checkEmailInDB.length === 0) {
            res.statusMessage ='Not authorised. Incorrect email/password';
            res.status(401).send();
            return;
        }
        const hashedPassword = checkEmailInDB[0].password;
        const correctPassword = await passwordHash.checkCorrectPassword(password, hashedPassword);
        if (correctPassword !== true) {
            res.statusMessage = 'Not authorised. Incorrect email/password';
            res.status(401).send();
            return;
        }
        const authToken = uid(20);
        const tokenRes = await users.registerAuthToken(authToken, email);
        if (tokenRes.affectedRows === 1) {
            res.statusMessage = 'Ok';
            res.status(200).send({userId: checkEmailInDB[0].id, token: authToken});
            return;
        }
    } catch (err) {
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    try{
        const authToken = req.headers['x-authorization'];
        const tokenDeleted = await users.deleteAuthToken(authToken);
        if (tokenDeleted.affectedRows === 0) {
            res.statusMessage = 'The authorization code given does not exist';
            res.status(401).send();
            return;
        }
        res.statusMessage = 'The authorize token has been removed';
        res.status(200).send();
        return;
    } catch (err) {
        if (err instanceof TypeError) {
            res.statusMessage = 'Unauthorized. Cannot log out if you are not authenticated';
            res.status(401).send();
            return;
        }
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    const authToken = req.headers['x-authorization'];
    try{
        if (isNaN(Number(userId))) {
            res.statusMessage = 'Not found. No user with specified ID';
            res.status(404).send();
            return;
        }
        const usersData = await users.getUserById(Number(userId));
        if (usersData.length === 0) {
            res.statusMessage = 'Not found. No user with specified ID';
            res.status(404).send();
            return;
        }
        if (usersData[0].auth_token === authToken) {
            res.statusMessage = 'Ok';
            res.status(200).send({email: usersData[0].email, firstName: usersData[0].first_name, lastName: usersData[0].last_name });
            return;
        } else {
            res.statusMessage = 'Ok';
            res.status(200).send({firstName: usersData[0].first_name, lastName: usersData[0].last_name});
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const update = async (req: Request, res: Response): Promise<void> => {
    const validation = await validator.validate(schemas.user_edit, req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send(`Bad Request: ${validation.toString()}`);
        return;
    }
    const authToken = req.headers['x-authorization'];
    const userId = req.params.id;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.password;
    const newEmail = req.body.email;
    const newFirstName = req.body.firstName;
    const newLastname = req.body.lastName;
    try{
        const userData = await users.getUserById(Number(userId));
        if (userData.length === 0) {
            res.statusMessage = "User does not exist";
            res.status(404).send();
            return;
        }
        const validToken = await users.checkIfAuthTokenValid(authToken);
        if(authToken === undefined || validToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (userData[0].auth_token !== authToken) {
            res.statusMessage = 'Forbidden. This is not your account';
            res.status(403).send();
            return;
        }
        // Updating a new password
        if (currentPassword !== undefined && newPassword !== undefined) {
            const correctPassword = await passwordHash.checkCorrectPassword(currentPassword, userData[0].password)
            if (correctPassword === false) {
                res.statusMessage = 'Current password is incorrect';
                res.status(401).send();
                return;
            }
            if (currentPassword === newPassword) {
                res.statusMessage = 'Identical current and new password';
                res.status(403).send();
                return;
            }
        }
        const encryptedNewPassword = await passwordHash.hash(newPassword);
        await users.updateUser(Number(userId), encryptedNewPassword, newEmail, newFirstName, newLastname);
        res.statusMessage = 'OK';
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}