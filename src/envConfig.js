import * as dotenv from "dotenv";
dotenv.config()

export const envConfig = {
    MARIA_DB : process.env.MARIA_DB,
    SQLITE_DB : process.env.SQLITE_DB
}