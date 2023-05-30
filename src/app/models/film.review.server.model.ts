import logger from "../../config/logger";
import {getPool} from "../../config/db";

const getReviewsWithFilmId = async (filmId: number): Promise<any> => {
    logger.http(`Getting reviews for film id: ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'select user_id as reviewerId, u.first_name as reviewerFirstName, '+
        'u.last_name as reviewerLastName, r.rating, r.review, r.timestamp from film_review r '+
        'left outer join user u on r.user_id = u.id where r.film_id = ? order by timestamp desc';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}

const checkIfAuthTokenExists = async (authToken: string | string[]): Promise<any> => {
    logger.http(`Checking if auth token exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where auth_token = ?';
    const [result] = await conn.query(query, [authToken]);
    await conn.release();
    return result;
}

const getFilmData = async (filmId: number): Promise<any> => {
    logger.http(`Getting film information with id ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}

const checkIfReleasedFilm = async (filmId: number): Promise<any> => {
    logger.http(`Checking if film ${filmId} has been released`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ? and release_date < CURRENT_TIMESTAMP';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}

const postNewReview = async (filmId: number, userId: number, rating: number, review: string): Promise<any> => {
    logger.http(`Posting review for film id ${filmId} by user ${userId}`);
    const conn = await getPool().getConnection();
    const query = 'insert into film_review (film_id, user_id, rating, review) values(?, ?, ?, ?)';
    const [result] = await conn.query(query, [filmId, userId, rating, review]);
    await conn.release();
    return result;
}

export{getReviewsWithFilmId, checkIfAuthTokenExists, getFilmData, checkIfReleasedFilm, postNewReview}