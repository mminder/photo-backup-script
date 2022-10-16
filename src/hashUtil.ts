import fs from 'fs';
import path from 'path';
import blockhash from 'blockhash-core';
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

export async function hashImageFolder(folderPath: string): Promise<ImageHashMap> {
    const imageHashMap = {};
    await hashImageFolderRecursively(folderPath, imageHashMap);
    return imageHashMap;
}

async function hashImageFolderRecursively(folderPath: string, imageHashMap: ImageHashMap): Promise<void> {
    const files = fs.readdirSync(folderPath);
    const filePromises = files.map(async (file: string) => {
        const filePath = path.join(folderPath, file);
        const fileStat = fs.statSync(filePath);
        if (fileStat.isDirectory()) {
            await hashImageFolderRecursively(filePath, imageHashMap);
        } else {
            let imageHash = await hashImage(filePath);
            if (!imageHashMap[imageHash]) {
                imageHashMap[imageHash] = [];
            }
            imageHashMap[imageHash].push(filePath);
        }
    });
    await Promise.all(filePromises);
}

async function hashImage(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const imageData = await imageFromBuffer(fileBuffer);
    let image = getImageData(imageData);
    if (!image) {
        throw new Error('could not convert image');
    }
    return blockhash.bmvbhash(image, 12);
}



