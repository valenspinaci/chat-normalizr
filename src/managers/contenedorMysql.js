import knex from "knex";
import log4js from "log4js";

//Configuracion log4js
log4js.configure({
    appenders:{
        consola:{type:"console"},
        fileWarn:{type:"file", filename:"./src/logs/fileWarn.txt"},
        fileError:{type:"file", filename:"./src/logs/fileError.txt"}
    },//Definir las salidas de datos --> Como mostrar y almacenar registros
    categories:{
        default:{appenders:["consola"], level:"trace"},
        warns:{appenders:["consola", "fileWarn"], level:"warn"},
        errors:{appenders:["consola", "fileError"], level:"error"}
    }
})

let logger = log4js.getLogger();
class ContenedorMysql{
    constructor(options, tableName){
        this.database = knex(options);
        this.table = tableName;
    }

    async getAll(){
        try {
            //Obtenemos productos de tabla
            const response = await this.database.from(this.table).select("*");
            return response;
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("No se pudieron obtener los productos")
        }
    }

    async save(object){
        try {
            const [id] = await this.database(this.table).insert(object);
            return `Producto agregado correctamente con el id ${id}`

        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("El producto no pudo ser guardado")
        }
    }

    async getById(id){
        try {
            const response = await this.database.from(this.table).select("*").where(this.table.id, id)
            return response;
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("El producto no pudo ser encontrado")
        }
    }

    async deleteById(id){
        try {
            const eliminado = await this.database.from(this.table).where(this.table.id, id).delete();
            return `El producto con el id ${id} ha sido eliminado`
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("El producto no pudo ser eliminado")
        }
    }

    async deleteAll(){
        try {
            await this.database.from(this.table).delete();
            return `La tabla ha sido eliminada`
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("Los productos no pudieron ser eliminados")
        }
    }
}

export {ContenedorMysql};