import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as validator from "./validator";
import * as schemas from "../resources/schemas.json";
import * as filmServerM from "../models/film.server.model"
import fs from "mz/fs";
const viewAll = async (req: Request, res: Response): Promise<void> => {
    const validation = await validator.validate(schemas.film_search, req.query);
    if (validation !== true) {
        res.statusMessage = 'Bad request';
        res.status(400).send();
        return;
    }
    let startIndex = Number(req.query.start);
    let count = Number(req.query.count);
    const q = req.query.q;
    const genreIds= req.query.genreIds;
    const ageRatings = req.query.ageRatings;
    const directorId = req.query.directorId;
    const reviewerId = req.query.reviewerId;
    const sortBy = req.query.sortBy;
    try{
        if (genreIds !== undefined) {
            const validGenre = await filmServerM.checkIfValidGenre(genreIds);
            if (validGenre.length === 0) {
                res.statusMessage = 'Bad Request: No genre with id';
                res.status(400).send();
                return ;
            }
        }
        const films = await filmServerM.getFilms(q, genreIds, ageRatings, directorId, reviewerId, sortBy);
        for (const film of films) {
            film.rating = Number(film.rating);
        }
        if(isNaN(startIndex)) {
            startIndex = 0;
        }
        if(isNaN(count)) {
            count = films.length;
        }
        res.statusMessage = "Ok";
        res.status(200).send({"films": films.slice(startIndex, count), "count": films.length});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const filmId = req.params.id;
        const validFilmId = await filmServerM.checkIfValidFilmId(Number(filmId));
        if (validFilmId.length === 0) {
            res.statusMessage = 'Not Found. No film with id';
            res.status(404).send();
            return ;
        }
        const film = await filmServerM.getAFilm(Number(filmId));
        film[0].rating = Number(film[0].rating);
        res.statusMessage = "Ok";
        res.status(200).send(film[0]);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addOne = async (req: Request, res: Response): Promise<void> => {
    const validation = await validator.validate(schemas.film_post, req.body);
    if (validation !== true) {
        res.statusMessage = 'Bad request';
        res.status(400).send();
        return;
    }
    try{
        const token = req.headers['x-authorization'];
        const title = req.body.title;
        const description = req.body.description;
        let releaseDate = req.body.releaseDate;
        const genreId = req.body.genreId;
        let runtime = req.body.runtime;
        let ageRating = req.body.ageRating;
        const date = new Date();
        const validToken = await filmServerM.checkIfAuthTokenValid(token);
        const validGenre = await filmServerM.checkIfGenreExists(Number(genreId));
        if (validGenre.length === 0) {
            res.statusMessage = 'Bad request. Invalid genre';
            res.status(400).send();
            return;
        }
        if(token === undefined || validToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        const directorId = validToken[0].id;
        const titleInUse = await filmServerM.checkIfTitleInUse(title);
        if (titleInUse.length !== 0) {
            res.statusMessage = "Forbidden. Film title is not unique";
            res.status(403).send();
            return;
        }
        if (releaseDate === undefined) {
            releaseDate = date.toString();
        } else {
            const enteredDate = new Date(releaseDate);
            if (enteredDate.toString() === "Invalid Date") {
                res.statusMessage = "Bad Request. Invalid datetime";
                res.status(400).send();
                return;
            }
            if(enteredDate < date) {
                res.statusMessage = "Forbidden. Cannot release a film in the past";
                res.status(403).send();
                return;
            }
        }
        if (ageRating === undefined) {
            ageRating = "TBC";
        }
        if (runtime === undefined) {
            runtime = null;
        }
        const result = await filmServerM.addNewFilm(title, description, releaseDate, genreId, runtime, directorId, ageRating);
        res.statusMessage = "Created!";
        res.status(201).send({"filmId": result.insertId});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const editOne = async (req: Request, res: Response): Promise<void> => {
    const validation = await validator.validate(schemas.film_patch, req.body);
    if (validation !== true) {
        res.statusMessage = 'Bad request';
        res.status(400).send();
        return;
    }
    try{
        const token = req.headers['x-authorization'];
        const filmId = req.params.id;
        const title = req.body.title;
        const description = req.body.description;
        const releaseDate = req.body.releaseDate;
        const genreId = req.body.genreId;
        const runtime = req.body.runtime;
        const ageRating = req.body.ageRating;
        const validToken = await filmServerM.checkIfAuthTokenValid(token);
        if (token === undefined || validToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (isNaN(Number(filmId))) {
            res.statusMessage = 'Not Found. No film found with id';
            res.status(404).send();
            return;
        }
        const filmInfo = await filmServerM.getInfoOfFilm(Number(filmId));
        if(filmInfo.length === 0) {
            res.statusMessage = 'Not Found. Film id does not exist';
            res.status(404).send();
            return;
        }
        const filmHasReviews = await filmServerM.checkIfFilmHasReview(Number(filmId));
        if (filmHasReviews.length !== 0) {
            res.statusMessage = 'Forbidden. Cannot edit a film that has a review placed';
            res.status(403).send();
            return;
        }
        if (filmInfo[0].director_id !== validToken[0].id) {
            res.statusMessage = 'Forbidden. Only the director of an film may change it';
            res.status(403).send();
            return;
        }
        if (genreId !== undefined) {
            const validGenre = await filmServerM.checkIfGenreExists(Number(genreId));
            if (validGenre.length === 0) {
                res.statusMessage = 'Forbidden. Genre does not exist';
                res.status(403).send();
                return;
            }
        }
        if (title !== undefined) {
            const validTitle = await filmServerM.checkIfTitleInUse(title);
            if (validTitle.length !== 0) {
                res.statusMessage = 'Forbidden. Title must be unique';
                res.status(403).send();
                return;
            }
        }
        if (releaseDate !== undefined) {
            const todayDate = new Date();
            const enteredDate = new Date(releaseDate);
            const alreadySetDate = new Date(filmInfo[0].release_date);
            if (enteredDate < todayDate) {
                res.statusMessage = 'Forbidden. Cannot release film in the past';
                res.status(403).send();
                return;
            }
            if (alreadySetDate < todayDate) {
                res.statusMessage = 'Forbidden. Cannot change releasedate since it has already released';
                res.status(403).send();
                return;
            }
        }
        const result = await filmServerM.updateFilm(Number(filmId), title, description,releaseDate, Number(genreId), Number(runtime), ageRating);
        res.statusMessage = "Ok";
        res.status(200).send(result);
        return;
    } catch (err) {
        if(err.code === 'ER_BAD_FIELD_ERROR') {
            res.statusMessage = "Film id invalid";
            res.status(404).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const token = req.headers['x-authorization'];
        const filmId = req.params.id;
        const validToken = await filmServerM.checkIfAuthTokenValid(token);
        if (token === undefined || validToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (isNaN(Number(filmId))) {
            res.statusMessage = 'Not Found. No film found with id';
            res.status(404).send();
            return;
        }
        const filmInfo = await filmServerM.getInfoOfFilm(Number(filmId));
        if (filmInfo.length === 0) {
            res.statusMessage = 'Not Found. No film found with id';
            res.status(404).send();
            return;
        }
        if (filmInfo[0].director_id !== validToken[0].id) {
            res.statusMessage = 'Forbidden. Only the director of an film can delete it';
            res.status(403).send();
            return;
        }
        if (filmInfo[0].image_filename !== null) {
            await fs.unlinkSync(`storage/images/${filmInfo[0].image_filename}`);
        }
        await filmServerM.deleteFilm(Number(filmId));
        res.statusMessage = "Ok";
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getGenres = async (req: Request, res: Response): Promise<void> => {
    try{
        const genres = await filmServerM.getAllGenres();
        res.statusMessage = "Ok";
        res.status(200).send(genres);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {viewAll, getOne, addOne, editOne, deleteOne, getGenres};