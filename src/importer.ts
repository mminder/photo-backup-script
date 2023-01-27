import path from "path";
import fs from "fs";
import {detectClashes, FolderHashResult, hashImageFolder, ImageHashMap} from "./hashUtil";

export async function importer(importImagesPath: string, mainImagesPath: string, dryRun: boolean) {
    const importImagesFolderHashResult: FolderHashResult = await hashImageFolder(importImagesPath);
    const mainFolderHashResult: FolderHashResult = await hashImageFolder(mainImagesPath);

    warnAboutDestDuplicates(mainFolderHashResult.imageHashMap);
    const importImagesHashMapWithoutDuplicate = removeDuplicates(importImagesFolderHashResult.imageHashMap);

    const clashes = detectClashes(mainFolderHashResult.imageHashMap, importImagesHashMapWithoutDuplicate);

    const ignoredImages: string[] = [];
    Object.entries(importImagesHashMapWithoutDuplicate).forEach(([hash, images]) => {
            if (images.length > 1) {
                throw new Error(`hash '${hash}' has multiple images '${images}'`);
            } else if (clashes.some(clash => clash.hash === hash)) {
                // do not import, is clash and already exists in main
                ignoredImages.push(images[0]);
            } else {
                // copy file
                const srcImg = images[0];
                const relativeSrcPath = path.relative(importImagesPath, srcImg);
                let dstPath = path.join(mainImagesPath, relativeSrcPath);

                // suffix dest if file by that name already exists
                let iterator = 2;
                while (fs.existsSync(dstPath)) {
                    const fileName = path.basename(dstPath);
                    const fileNameParts = fileName.split('.');
                    const newFilename = fileNameParts[0] + '-' + iterator + fileNameParts[1];
                    dstPath = path.join(path.dirname(dstPath), newFilename);
                    iterator++;
                }

                if (!dryRun) {
                    console.log(`copy ${srcImg} to ${dstPath}`);
                    fs.cpSync(srcImg, dstPath);
                } else {
                    console.log(`DRY RUN copy ${srcImg} to ${dstPath}`);
                }
            }
        }
    );

    console.log(`\nsome images were not copied because they were already in dest folder:\n${ignoredImages.join('\n')}\n`);
}

function removeDuplicates(imageHashMap: ImageHashMap): ImageHashMap {
    const cleanedMap: ImageHashMap = {};

    Object.entries(imageHashMap).forEach(([hash, images]) => {
        if (images.length > 1) {
            console.log(`WARN: import src has duplicates. keeping only first image for import: hash '${hash}' images: \n${images.join('\n')}\n`)
        }
        cleanedMap[hash] = [images[0]]
    });

    return cleanedMap;
}

function warnAboutDestDuplicates(mainFolderImageHashMap: ImageHashMap) {
    Object.entries(mainFolderImageHashMap).forEach(([hash, images]) => {
        if (images.length > 1) {
            console.log(`WARN: import dest has duplicates hash: '${hash}' images:\n${images.join('\n')}\n`);
        }
    });
}

