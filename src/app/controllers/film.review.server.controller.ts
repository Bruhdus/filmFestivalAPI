import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as filmReview from "../models/film.review.server.model";
import * as validator from "../controllers/validator";
import * as schemas from '../resources/schemas.json';


const getReviews = async (req: Request, res: Response): Promise<void> => {
    const filmId = req.params.id;
    try{
        const validFilmId = await filmReview.getFilmData(Number(filmId));
        if(validFilmId.length === 0) {
            res.statusMessage ='Not Found. No film found with id';
            res.status(404).send();
            return;
        }
        const allReviews = await filmReview.getReviewsWithFilmId(Number(filmId));
        res.statusMessage = 'Ok';
        res.status(200).send(allReviews);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const addReview = async (req: Request, res: Response): Promise<void> => {
    try{
        const filmId = req.params.id;
        const authToken = req.headers['x-authorization'];
        const validation = await validator.validate(schemas.film_review_post, req.body);
        const rating = req.body.rating;
        let review = req.body.review;
        const validAuthToken = await filmReview.checkIfAuthTokenExists(authToken);
        if (validation !== true) {
            res.statusMessage = 'Bad request. Invalid information';
            res.status(400).send();
            return;
        }
        if (authToken === undefined || validAuthToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        const filmData = await filmReview.getFilmData(Number(filmId));
        if (filmData.length === 0) {
            res.statusMessage = "Not Found. No film with id";
            res.status(404).send();
            return;
        }
        const checkIfFilmReleased = await filmReview.checkIfReleasedFilm(Number(filmId));
        if (filmData[0].director_id === validAuthToken[0].id || checkIfFilmReleased.length === 0) {
            res.statusMessage ='Forbidden. Cannot review your own film, or cannot post a review on a film that has not yet released';
            res.status(403).send();
            return;
        }
        if (review === undefined) {
            review = 'NULL';
        }
        await filmReview.postNewReview(Number(filmId), Number(validAuthToken[0].id), Number(rating), review);
        res.statusMessage = 'Created';
        res.status(201).send();
        return;
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.statusMessage = 'Can not post another review on the same film';
            res.status(403).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}



export {getReviews, addReview}