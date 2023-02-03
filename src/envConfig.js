import * as dotenv from "dotenv";
dotenv.config()

export const envConfig = {
    SQLITE_DB : process.env.SQLITE_DB
}