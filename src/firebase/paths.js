import { collection, doc } from 'firebase/firestore';
import { db } from './config';
import { MAP_ID } from '../config/site';

/*  maps/{mapId}                     the layout document
    maps/{mapId}/<plots>/{id}        PlotData docs — subcollection name is
                                     resolved at runtime, see mapRepo.js
    maps/{mapId}/quotations/{id}     quotations saved from this viewer   */

export const mapDoc = (id = MAP_ID) => doc(db, 'maps', id);
export const mapSubcollection = (name, id = MAP_ID) => collection(db, 'maps', id, name);
export const quotationsCol = (id = MAP_ID) => collection(db, 'maps', id, 'quotations');
export const docAtPath = (path) => doc(db, path);
