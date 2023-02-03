import fs from "fs";
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

class Contenedor {
    constructor(filename){
        this.filename = filename;
    }

    async save(product){
        try {
            const productos = await this.getAll();
            if(productos.length>0){
                //Agregar producto adicional
                const lastId = productos[productos.length-1].id+1;
                product.id = lastId;
                productos.push(product);
                await fs.promises.writeFile(this.filename, JSON.stringify(productos, null, 2));
            } else{
                //Agregar primer producto
                product.id = 1;
                await fs.promises.writeFile(this.filename, JSON.stringify([product], null, 2));
            }
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("El producto no pudo ser guardado")
        }
    }

    async getAll(){
        try {
            const contenido = await fs.promises.readFile(this.filename, "utf-8");
            if(contenido.length>0){
                const contenidoParseado = await JSON.parse(contenido);
                return contenidoParseado;
            } else{
                return [];
            }
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("Hubo un error leyendo el archivo")
        }
    }

    async getById(id){
        try {
            const productos = await this.getAll();
            const productoEncontrado = productos.find(product => product.id == id);
            return productoEncontrado;
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("El producto no se encuentra")
        }
    }

    async deleteById(id){
        try {
            const productos = await this.getAll();
            const productosNuevos = productos.filter(product => product.id !== id);
            await fs.promises.writeFile(this.filename, JSON.stringify(productosNuevos, null, 2));
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("El producto a eliminar no se pudo encontrar")
        }
    }

    async deleteAll(){
        try {
            const archivoVacio = await fs.promises.writeFile(this.filename, []);
        } catch (error) {
            logger = log4js.getLogger("errors")
            logger.error("No se pudieron eliminar los objetos")
        }
    }
}

export {Contenedor};