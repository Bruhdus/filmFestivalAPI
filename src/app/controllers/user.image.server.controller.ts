import {Request, Response} from "express";
import * as usersImage from '../models/user.image.server.model';
import Logger from "../../config/logger";
import {uid} from 'rand-token';
import path from 'path';
import fs from 'mz/fs';

const getImage = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    try{
        const userData = await usersImage.getUserById(Number(userId));
        const userProfile = userData[0].image_filename;
        if (userProfile === null) {
            res.statusMessage = 'User has no profile image';
            res.status(404).send();
            return;
        }
        if (userData.length === 0) {
            res.statusMessage = 'User does not exist';
            res.status(404).send();
            return;
        }
        const file = path.resolve(`storage/images/${userProfile}`);
        res.statusMessage = 'Ok';
        res.status(200).sendFile(file);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const userId = req.params.id;
        const authToken = req.headers['x-authorization'];
        const imageType = req.headers['content-type'];
        const image = req.body;
        const validImageTypes = ['image/png', 'image/jpeg', 'image/gif'];
        const userData = await usersImage.getUserById(Number(userId));
        const validToken = await usersImage.checkIfAuthTokenValid(authToken);
        if (userData.length === 0) {
            res.statusMessage ="User does not exist";
            res.status(404).send();
            return;
        }
        if (authToken === undefined || validToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (userData[0].auth_token !== authToken) {
            res.statusMessage = 'Unauthorized';
            res.status(403).send();
            return;
        }
        if (validImageTypes.includes(imageType) === false) {
            res.statusMessage = 'Bad Request. Invalid image supplied (possibly incorrect file type)';
            res.status(400).send();
            return;
        }
        let imageName = uid(10);
        imageName = imageName.concat('.').concat(imageType.substring(6));
        await fs.writeFile(`storage/images/${imageName}`, image);
        if (userData[0].image_filename !== null) {
            await usersImage.updateUserImage(Number(userId), imageName);
            res.statusMessage = 'Ok, Image updated';
            res.status(200).send();
        } else {
            await usersImage.updateUserImage(Number(userId), imageName);
            res.statusMessage = 'Created. New image created';
            res.status(201).send();
        }
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const deleteImage = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    const authToken = req.headers['x-authorization'];
    const validToken = await usersImage.checkIfAuthTokenValid(authToken);
    try{
        if (authToken === undefined || validToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        const userData = await usersImage.getUserById(Number(userId));
        if (userData.length === 0) {
            res.statusMessage = "User does not exist";
            res.status(404).send();
            return;
        }
        if (userData[0].auth_token !== authToken) {
            res.statusMessage = 'Forbidden. Can not delete another users profile photo';
            res.status(403).send();
            return;
        }
        await usersImage.deleteUserImage(Number(userId));
        await fs.unlinkSync(`storage/images/${userData[0].image_filename}`);
        res.statusMessage = 'Ok';
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage, deleteImage}