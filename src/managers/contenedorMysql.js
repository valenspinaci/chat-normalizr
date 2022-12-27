import knex from "knex";
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
            return `Hubo un error: ${error}`
        }
    }

    async save(object){
        try {
            const [id] = await this.database(this.table).insert(object);
            return `Producto agregado correctamente con el id ${id}`

        } catch (error) {
            return `Hubo un error: ${error}`
        }
    }

    async getById(id){
        try {
            const response = await this.database.from(this.table).select("*").where(this.table.id, id)
            return response;
        } catch (error) {
            console.log(error)
        }
    }

    async deleteById(id){
        try {
            const eliminado = await this.database.from(this.table).where(this.table.id, id).delete();
            return `El producto con el id ${id} ha sido eliminado`
        } catch (error) {
            console.log(error)
        }
    }

    async deleteAll(){
        try {
            await this.database.from(this.table).delete();
            return `La tabla ha sido eliminada`
        } catch (error) {
            console.log(error)
        }
    }
}

export {ContenedorMysql};