import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as filmImageM from "../models/film.image.server.model";
import fs from 'mz/fs';
import path from "path";
import {uid} from "rand-token";


const getImage = async (req: Request, res: Response): Promise<void> => {
    const filmId = req.params.id;
    try{
        const filmImage = await filmImageM.getFilmImage(Number(filmId));
        if (filmImage.length === 0 || filmImage[0].image_filename === null) {
            res.status(404).send('Not found. No film found with id, or film has no image');
            return;
        }
        const file = path.resolve(`storage/images/${filmImage[0].image_filename}`);
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
        const filmId = req.params.id;
        const authToken = req.headers['x-authorization'];
        const imageType = req.headers['content-type'];
        const validImageTypes = ['image/png', 'image/jpeg', 'image/gif'];
        const image = req.body;
        const filmReviews = await filmImageM.getReviewsForFilm(Number(filmId));
        const checkValidToken = await filmImageM.checkIfAuthTokenValid(authToken);
        if (authToken === undefined || checkValidToken.length === 0) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        const dirId = await filmImageM.getDirectorId(Number(filmId));
        if (dirId.length === 0) {
            res.statusMessage = 'Not Found. No film found with id';
            res.status(404).send();
            return;
        }
        const dirIdAuthToken = await filmImageM.getDirIdAuthToken(Number(dirId[0].director_id));
        if (authToken !== dirIdAuthToken[0].auth_token || filmReviews.length !== 0) {
            res.statusMessage = 'Forbidden. Only the director of a film can change the hero image';
            res.status(403).send();
            return;
        }
        if (validImageTypes.includes(imageType) === false) {
            res.statusMessage = 'Bad request';
            res.status(400).send();
            return;
        }
        const filmImage = await filmImageM.getFilmImage(Number(filmId));
        let imageName = uid(10);
        imageName = imageName.concat('.').concat(imageType.substring(6));
        await fs.writeFile(`storage/images/${imageName}`, image);
        if (filmImage[0].image_filename !== null) {
            await filmImageM.updateFilmImage(Number(filmId), imageName);
            res.statusMessage = 'Ok, Image updated';
            res.status(200).send();
        } else {
            await filmImageM.updateFilmImage(Number(filmId), imageName);
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

export {getImage, setImage};