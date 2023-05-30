import {getPool} from "../../config/db";
import Logger from '../../config/logger';

const checkIfValidGenre = async (genreId: any): Promise<any> => {
    Logger.http(`Checking if genre id ${genreId} is valid`);
    const conn = await getPool().getConnection();
    let query = 'select name from genre where id in (';
    if (typeof genreId !== "string" && genreId.length > 1) {
        query += genreId[0];
        for (const id of genreId.slice(1)) {
            query += ',';
            query += id;
        }
        query += ')';
        const [listResult] = await conn.query(query);
        await conn.release();
        return listResult;
    }
    query += genreId;
    query += ')';
    const [result] = await conn.query(query);
    await conn.release();
    return result;
}

const checkIfValidFilmId = async (filmId: number): Promise<any> => {
    Logger.info(`Checking if film id ${filmId} exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select title from film where id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}

const getFilms = async (q: any, genreIds: any, ageRatings: any , directorId: any, reviewerId: any, sortBy: any): Promise<any> => {
    Logger.info(`Getting requested films`);
    const createViewQuery = 'create view infofilms as select f.id, f.title, f.description, '+
        'f.release_date, f.image_filename, f.director_id, f.genre_id, ' +
        'f.age_rating, ifnull(round(avg(r.rating), 2), 0) as rating, u.first_name, u.last_name ' +
        'from film f left outer join user u on f.director_id = u.id left outer join ' +
        'film_review r on f.id = r.film_id group by f.id order by f.release_date';
    let query = 'select id as filmId, title, genre_id as genreId, director_id as directorId, ' +
        'first_name as directorFirstName, last_name as directorLastName, ' +
        'release_date as releaseDate, age_rating as ageRating, rating from infofilms where';
    let noQuery = true;
    const input: any[] = [];
    if (q !== undefined) {
        noQuery = false;
        query += ' (title like ? or description like ?)';
        input.push('%'+q+'%', '%'+q+'%');
    }
    if (genreIds !== undefined) {
        let tempQuery = ' and genre_id in (';
        if (noQuery) {
            tempQuery = ' genre_id in (';
        }
        noQuery = false;
        if (typeof genreIds !== "string" && genreIds.length > 1) {
            tempQuery += genreIds[0];
            for (const id of genreIds.slice(1)) {
                tempQuery += ',';
                tempQuery += id;
            }
        } else {
            tempQuery += genreIds;
        }
        tempQuery += ')';
        query += tempQuery;
    }
    if (ageRatings !== undefined) {
        let tempQuery = ' and age_rating in (';
        if (noQuery) {
            tempQuery = ' age_rating in (';
        }
        noQuery = false;
        if (typeof ageRatings !== "string" && ageRatings.length > 1) {
            tempQuery += '?';
            input.push(ageRatings[0]);
            for (const id of ageRatings.slice(1)) {
                tempQuery += ',';
                tempQuery += '?';
                input.push(id);
            }
        } else {
            tempQuery += '?';
            input.push(ageRatings);
        }
        tempQuery += ')';
        query += tempQuery;
    }
    if (directorId !== undefined) {
        if (noQuery) {
            query += ' director_id = ?';
            input.push(directorId);
            noQuery = false;
        } else {
            query += ' and director_id = ?';
            input.push(directorId);
        }
    }
    if (reviewerId !== undefined) {
        if (noQuery) {
            query += ' id in (select film_id from film_review where user_id = ?)';
            input.push(reviewerId);
            noQuery = false;
        } else {
            query += ' and id in (select film_id from film_review where user_id = ?)';
            input.push(reviewerId);
        }
    }
    if (sortBy !== undefined) {
        if (noQuery) {
            noQuery = false;
            query = query.slice(0, -6);
        }
        switch (sortBy) {
            case 'ALPHABETICAL_ASC':
                query += ' order by title';
                break;
            case 'ALPHABETICAL_DESC':
                query += ' order by title desc';
                break;
            case 'RELEASED_ASC':
                query += ' order by release_date';
                break;
            case 'RELEASED_DESC':
                query += ' order by release_date desc';
                break;
            case 'RATING_ASC':
                query += ' order by rating, id';
                break;
            case 'RATING_DESC':
                query += ' order by rating desc, id';
                break;
        }
    }
    // executing the request
    if (noQuery) {
        query = query.slice(0, -6);
    }
    const conn = await getPool().getConnection();
    try{
        await conn.query(createViewQuery);
    } catch (err) {
        if (err.code === "ER_TABLE_EXISTS_ERROR") {
            await conn.query('drop view infofilms');
            await conn.query(createViewQuery);
        }
    }
    const[result] = await conn.query(query, input);
    await conn.query('drop view infofilms');
    await conn.release();
    return result;
}

const getAFilm = async (filmId: number): Promise<any> => {
    Logger.info(`Getting requested film with id ${filmId}`);
    const createViewQuery = 'create view allaboutfilms as select f.id, f.title, f.description, '+
        'f.release_date, f.director_id, f.genre_id, f.runtime, f.age_rating, ' +
        'ifnull(round(avg(r.rating), 2), 0) as rating, count(r.film_id) as numReviews, u.first_name, u.last_name ' +
        'from film f left outer join user u on f.director_id = u.id left outer join ' +
        'film_review r on f.id = r.film_id group by f.id';
    const query = 'select id as filmId, title, description, genre_id as genreId, director_id as directorId, '+
        'first_name as directorFirstName, last_name as directorLastName, release_date as releaseDate, '+
        'age_rating as ageRating, runtime, rating, numReviews from allaboutfilms where id = ?'
    const conn = await getPool().getConnection();
    try{
        await conn.query(createViewQuery);
    } catch (err) {
        if (err.code === "ER_TABLE_EXISTS_ERROR") {
            await conn.query('drop view allaboutfilms');
            await conn.query(createViewQuery);
        }
    }
    const [result] = await conn.query(query, [filmId]);
    await conn.query('drop view allaboutfilms');
    await conn.release();
    return result;
}

const checkIfTitleInUse = async (title: string): Promise<any> => {
    Logger.info(`Checking if title "${title}" is in use`);
    const conn = await getPool().getConnection();
    const query = 'select title from film where title = ?';
    const [result] = await conn.query(query, [title]);
    await conn.release();
    return result;
}

const checkIfGenreExists = async (genreId: number): Promise<any> => {
    Logger.info(`Checking if genre ${genreId} exists`);
    const conn = await getPool().getConnection();
    const query = 'select name from genre where id = ?';
    const [result] = await conn.query(query, [genreId]);
    await conn.release();
    return result;
}

const checkIfAuthTokenValid = async (authTok: string | string[]): Promise<any> => {
    Logger.http(`Checking if auth token is valid`);
    const conn = await getPool().getConnection();
    const query = 'select id from user where auth_token = ?';
    const [result] = await conn.query(query, [authTok]);
    await conn.release();
    return result;
}

const addNewFilm  = async (title: string, description: string, releaseDate: string, genreId: number,
                           runtime: number, directorId: string, ageRating: string): Promise<any> => {
    Logger.http(`Adding new film "${title} into the database"`);
    const conn = await getPool().getConnection();
    const query = 'insert into film (title, description, release_date, genre_id, runtime, director_id, age_rating) values(?, ?, ?, ?, ?, ?, ?)';
    const [result] = await conn.query(query, [title, description, releaseDate, genreId, runtime, directorId, ageRating]);
    await conn.release();
    return result;
}

const getInfoOfFilm = async (filmId: number): Promise<any> => {
    Logger.http(`Getting all data for film id ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}
const checkIfFilmHasReview = async (filmId: number): Promise<any> => {
    Logger.http(`Checking if film id ${filmId} has any reviews`);
    const conn = await getPool().getConnection();
    const query = 'select id from film_review where film_id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}

const updateFilm = async (filmId: number, title: string, description: string, releaseDate: string,
                          genreId: number, runtime: number, ageRating: string): Promise<any> => {
    Logger.http(`Updating film id ${filmId}`);
    let firstCon = true;
    const conn = await getPool().getConnection();
    let query = 'update film set';
    if (title !== undefined) {
        if (firstCon) {
            query += ` title = '${title}'`;
            firstCon = false;
        } else {
            query += `, title = '${title}'`;
        }
    }
    if (description !== undefined) {
        if (firstCon) {
            query += ` description = '${description}'`;
            firstCon = false;
        } else {
            query += `, description = '${description}'`;
        }
    }
    if (releaseDate !== undefined) {
        if (firstCon) {
            query += ` release_date = '${releaseDate}'`;
            firstCon = false;
        } else {
            query += `, release_date = '${releaseDate}'`;
        }
    }
    if (!isNaN(genreId)) {
        if (firstCon) {
            query += ` genre_id = ${genreId}`;
            firstCon = false;
        } else {
            query += `, genre_id = ${genreId}`;
        }
    }
    if (!isNaN(runtime)) {
        if (firstCon) {
            query += ` runtime = ${runtime}`;
            firstCon = false;
        } else {
            query += `, runtime = ${runtime}`;
        }
    }
    if (ageRating !== undefined) {
        if (firstCon) {
            query += ` age_rating = '${ageRating}'`;
        } else {
            query += `, age_rating = '${ageRating}'`;
        }
    }
    query += ` where id = ${filmId}`;
    Logger.http(query);
    const [result] = await conn.query(query);
    await conn.release();
    return result;
}

const getAllGenres = async (): Promise<any> => {
    Logger.http(`Getting all genres`);
    const conn = await getPool().getConnection();
    const query = 'select id as genreId, name from genre';
    const [result] = await conn.query(query);
    await conn.release();
    return result;
}

const deleteFilm = async (filmId: number): Promise<any> => {
    Logger.http(`Deleting film id ${filmId}`);
    const conn = await getPool().getConnection();
    const query = 'delete from film where id = ?';
    const [result] = await conn.query(query, [filmId]);
    await conn.release();
    return result;
}


export {checkIfValidGenre,checkIfValidFilmId, getFilms, getAFilm, checkIfTitleInUse, checkIfGenreExists,
    checkIfAuthTokenValid, addNewFilm, getInfoOfFilm, checkIfFilmHasReview, updateFilm, getAllGenres, deleteFilm}