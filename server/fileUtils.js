const path = require("node:path");
const fs = require("node:fs");

/**
 * Проверить существование файла или папки
 * @param {string} fullName 
 * @returns {Promise<boolean>}
 */
const isFileExists = async (fullName) => {
    try {
        await fs.promises.access(fullName, fs.constants.F_OK)
        return true
    } catch (e) {
        if (e.code === 'ENOENT') {
            return false
        }
        throw e
    }
}

/**
 * Проверка существования папки для указанного имени. Если отсутствует, то будет создано.
 * @param {string} fullName 
 * @returns {Promise<void>}
 */
const checkFolder = async (fullName) => {
    const {dir} = path.parse(fullName);
    const folderExists = await isFileExists(dir);
    if (!folderExists) {
        await fs.promises.mkdir(dir, {recursive: true});
    }
}

module.exports = {isFileExists, checkFolder};