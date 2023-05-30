import {getPool} from "../../config/db";
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import logger from "../../config/logger";

const getUserById = async (userId: number): Promise<any> => {
    logger.http(`Getting user ${userId}`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where id = ?';
    const [result] = await conn.query(query, [userId]);
    await conn.release();
    return result;
}

const updateUserImage = async (userId: number, image: string): Promise<any> => {
    logger.http(`Updating user ${userId} image to ${image}`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = ? where id = ?';
    const [result] = await conn.query(query, [image, userId]);
    await conn.release();
    return result;
}

const deleteUserImage = async (userId: number): Promise<any> => {
    logger.http(`Deleting image from user ${userId}`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = NULL where id = ?';
    const [result] = await conn.query(query, [userId]);
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

export{getUserById, updateUserImage, deleteUserImage, checkIfAuthTokenValid}