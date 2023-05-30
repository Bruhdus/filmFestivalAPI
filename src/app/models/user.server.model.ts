import {getPool} from "../../config/db";
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import logger from "../../config/logger";

const register = async (email: string, firstName: string, lastName: string, password: string): Promise<any> => {
    Logger.info(`Registering new user ${firstName} to the database`);
    const conn = await getPool().getConnection();
    const query = 'insert into user (email, first_name, last_name, password) values(?, ?, ?, ?)';
    const[result] = await conn.query(query, [email, firstName, lastName, password]);
    await conn.release();
    return result;
}

const checkEmailInDB = async (email: string): Promise<any> => {
    logger.info(`Checking if email: ${email} is already in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where email = ?';
    const [result] = await conn.query(query, [email]);
    await conn.release();
    return result;
}

const registerAuthToken = async (token: string, email: string): Promise<ResultSetHeader> => {
    logger.info(`Registering a new token to ${email}`);
    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = ? where email = ?';
    const [result] = await conn.query(query, [token, email]);
    await conn.release();
    return result;
}

const deleteAuthToken = async (token: string | string[]): Promise<ResultSetHeader> => {
    logger.info(`Checking if the token ${token} is in the database`);
    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = NULL where auth_token = ?';
    const [result] = await conn.query(query, [token]);
    await conn.release();
    return result;
}

const getUserById = async (userId: number): Promise<any> => {
    logger.http(`Getting user ${userId}`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where id = ?';
    const [result] = await conn.query(query, [userId]);
    await conn.release();
    return result;
}

const updateUser = async (userId: number, newPassword: string, email: string, firstName: string, lastName: string): Promise<any> => {
    logger.http(`Updating user: ${userId}`);
    const conn = await getPool().getConnection();
    let query = 'update user set';
    let firstQuery = true;
    if (newPassword !== undefined) {
        if (firstQuery) {
            query += ` password = '${newPassword}'`;
            firstQuery = false;
        } else {
            query += `, password = '${newPassword}'`;
        }
    }
    if (email !== undefined) {
        if (firstQuery) {
            query += ` email = '${email}'`;
            firstQuery = false;
        } else {
            query += `, email = '${email}'`;
        }
    }
    if (firstName !== undefined) {
        if (firstQuery) {
            query += ` first_name = '${firstName}'`;
            firstQuery = false;
        } else {
            query += `, first_name = '${firstName}'`;
        }
    }
    if (lastName !== undefined) {
        if (firstQuery) {
            query += ` last_name = '${lastName}'`;
        } else {
            query += `, last_name = '${lastName}'`;
        }
    }
    query += ` where id = ${userId}`;
    const [result] = await conn.query(query);
    await conn.release();
    return result;
}

const checkIfAuthTokenValid = async (authTok: string | string[]): Promise<any> => {
    logger.http(`Checking if auth token is valid`);
    const conn = await getPool().getConnection();
    const query = 'select id from user where auth_token = ?';
    const [result] = await conn.query(query, [authTok]);
    await conn.release();
    return result;
}

export {register, checkEmailInDB, registerAuthToken, deleteAuthToken, getUserById, updateUser, checkIfAuthTokenValid}