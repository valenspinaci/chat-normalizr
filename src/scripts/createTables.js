import { options } from "../config/databaseConfig.js";
import knex from "knex";

const databaseMariadb = knex(options.mariaDB);
const databaseSqlite = knex(options.sqliteDB);

//Creamos tabla de productos
const createTables = async()=>{
    try {
        let productosTable = await databaseMariadb.schema.hasTable("productos");
        if(productosTable){
            await databaseMariadb.schema.dropTable("productos")
        }
        await databaseMariadb.schema.createTable("productos", table=>{
            table.increments("id");
            table.string("title", 40).nullable(false);
            table.integer("price").nullable(false);
            table.string("thumbnail", 200).nullable(false)
        });
        console.log("Tabla de productos creada")
    } catch (error) {
        console.log(error)
    }
    databaseMariadb.destroy();
    databaseSqlite.destroy();
}
createTables()