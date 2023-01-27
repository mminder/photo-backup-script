import fs from 'fs';
import path from 'path';
import blockhash from 'blockhash-core';
import crypto from 'crypto';
import {getImageData, imageFromBuffer} from '@canvas/image';

export interface ImageHashMap {
    // key: imageHash
    // value: paths to images
    [key: string]: string[];
}

export interface Clash {
    importImage: string[],
    existingMainImage: string[],
    hash: string
}

export function detectClashes(mainFolderImageHashMap: ImageHashMap, importImagesHashMap: ImageHashMap): Clash[] {
    const mainHashes = Object.keys(mainFolderImageHashMap);
    const importHashes = Object.keys(importImagesHashMap);

    const clashes: Clash[] = [];

    importHashes.forEach(importHash => mainHashes.forEach(mainHash => {
        if (mainHash === importHash) {
            clashes.push({
                importImage: importImagesHashMap[importHash],
                existingMainImage: mainFolderImageHashMap[mainHash],
                hash: importHash
            })
        }
    }));

    return clashes;
}

export async function hashImageFolder(folderPath: string): Promise<FolderHashResult> {
    const resultPromises = hashImageFolderRecursively(folderPath);

    const folderHashResults = await Promise.all(resultPromises.map(resultPromise => resultPromise.promise));

    const combinedResult : FolderHashResult = {
        imageHashMap: {}
    }
    folderHashResults.forEach(result => {
        Object.keys(result.imageHashMap).forEach(key => {
            if(!combinedResult.imageHashMap[key]){
                combinedResult.imageHashMap[key] = [];
            }
            combinedResult.imageHashMap[key] = combinedResult.imageHashMap[key].concat(result.imageHashMap[key]);
        });
    });

    return combinedResult;
}

export interface FolderHashResult {
    imageHashMap: ImageHashMap;
}

export interface ResultPromise {
    path: string;
    promise: Promise<FolderHashResult>;
}

function hashImageFolderRecursively(folderPath: string): ResultPromise[] {
    const files = fs.readdirSync(folderPath);

    let resultPromises: ResultPromise[] = [];

    files.forEach((file: string) => {
        const filePath = path.join(folderPath, file);
        const fileStat = fs.statSync(filePath);

        if (fileStat.isDirectory()) {
            const nestedResults = hashImageFolderRecursively(filePath);
            resultPromises = resultPromises.concat(nestedResults);
        } else {
            const imagePromise = hashImage(filePath).then(imageHash => {
                const result: FolderHashResult = {
                    imageHashMap: {}
                };

                if (!result.imageHashMap[imageHash]) {
                    result.imageHashMap[imageHash] = [];
                }
                result.imageHashMap[imageHash].push(filePath);
                return result;
            }).catch(err => {
                throw new Error('could not hash '+ filePath);
            });

            resultPromises.push({
                path: filePath,
                promise: imagePromise
            });
        }
    });

    return resultPromises;
}

async function hashImage(filePath: string): Promise<string> {

    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, fileBuffer) => {
            if (err) {
                reject(err);
            }

            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);

            const hex = hashSum.digest('hex');

            resolve(hex);
        });
    });


    /* real image hashing, is slow
    return new Promise((resolve, reject) => {
        console.log(`1 hashing image ${filePath}`);
        // FIXME: add file ending check here
        fs.readFile(filePath, (err, fileBuffer) => {
            if (err) {
                reject(err);
            }
            imageFromBuffer(fileBuffer).then(imageData => {
                try {
                    let image = getImageData(imageData);
                    // @ts-ignore
                    resolve(blockhash.bmvbhash(image, 12));
                } catch (err) {
                    reject(err);
                }
            }).catch(err => reject(err));
        });
    });
     */
}



