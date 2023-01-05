import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const options = {
    mariaDB:{
        client:"mysql",
        connection:{
            host:"127.0.0.1",
            user:"root",
            password:"",
            database:"chatDatabase"
        }
    },
    sqliteDB:{
        client:"sqlite",
        connection:{
            filename: path.join(__dirname, "../DB/chatDB.sqlite")
        },
        useNullAsDefault:true
    },
    mongoAtlas:{
        urlDB: "mongodb+srv://valenspinaci:Valentino26@backend-coder.ksqybs9.mongodb.net/sessions?retryWrites=true&w=majority"
    }
}

export {options};