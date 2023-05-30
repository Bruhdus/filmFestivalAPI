import {getPool} from "../../config/db";
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import logger from "../../config/logger";


const getFilmImage = async (filmId: number): Promise<any> => {
    logger.http(`Getting film image of film ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'select image_filename from film where id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}
const getDirectorId = async (filmId: number): Promise<any> => {
    logger.http(`Getting film director of film ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'select director_id from film where id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}

const getDirIdAuthToken = async (dirId: number): Promise<any> => {
    logger.http(`Getting auth token of user ${dirId}`);
    const conn = await getPool().getConnection();
    const query = 'select auth_token from user where id = ?';
    const [result] = await conn.query(query, [dirId]);
    await conn.release();
    return result;
}

const getReviewsForFilm = async (filmId: number): Promise<any> => {
    logger.http(`Getting reviews for film ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'select id from film_review where film_id = ?';
    const [result] = await conn.query(query, [filmId]);
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

const updateFilmImage = async (filmId: number, fileName: string): Promise<any> => {
    logger.http(`Updating film image`);
    const conn = await getPool().getConnection();
    const query = 'update film set image_filename = ? where id = ?';
    const [result] = await conn.query(query, [fileName, filmId]);
    await conn.release();
    return result;
}


export{getDirectorId, getFilmImage, getDirIdAuthToken, getReviewsForFilm, checkIfAuthTokenValid, updateFilmImage}