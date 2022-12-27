import express from "express";
import handlebars from "express-handlebars";
import {Server} from "socket.io"
import {ContenedorMysql} from "./managers/ContenedorMysql.js"
import { options } from "./config/databaseConfig.js"
import path from 'path';
import { fileURLToPath } from 'url';
import {faker} from "@faker-js/faker";
import { Contenedor } from "./index.js";
import { normalize, schema } from "normalizr";
faker.locale = "es"

const {commerce, image} = faker;

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();

const products = new ContenedorMysql(options.mariaDB, "productos");
const messages = new Contenedor("src/DB/chat.txt");

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"))

const PORT = 8080 || process.env.PORT;

const server = app.listen(PORT, () => console.log(`Servidor inicializado en el puerto ${PORT}`));

//Configurar servidor para indicarle que usaremos motor de plantillas
app.engine("handlebars", handlebars.engine());

//Indicar donde están las vistas
app.set("views", __dirname + "/views");

//Indicar el motor que usaré en express
app.set("view engine", "handlebars");

//Configurar websocket del lado del servidor
const io = new Server(server);

io.on("connection", async (socket) => {
    console.log("Nuevo cliente conectado");

    //Productos
    //Cada vez que socket se conecte le envio los productos
    socket.emit("products", await products.getAll());
    socket.on("newProduct", async (data) => {
        await products.save(data);
        io.sockets.emit("products", await products.getAll())
    });

    //Normalizacion
//Definir esquemas
const authorSchema = new schema.Entity("authors",{},{idAttribute:"email"})//Id con el valor del campo email
const messageSchema = new schema.Entity("messages",{
    author:authorSchema
})

//Esquema global
const chatSchema = new schema.Entity("chats",{
    messages:[messageSchema]
})

//Aplicar la normalizacion
//Funcion que normaliza datos
const normalizarData= (data)=>{
    const dataNormalizada = normalize({id:"chatHistory", messages:data}, chatSchema);
    return dataNormalizada;
}

//Funcion que normaliza mensajes
const normalizarMensajes = async()=>{
    const mensajes = await messages.getAll();
    const mensajesNormalizados = normalizarData(mensajes);
    return mensajesNormalizados;
}


    //Chat
    //Enviar los mensajes al cliente
    io.sockets.emit("messagesChat", await normalizarMensajes());
    socket.on("newMsg", async(data)=>{
        await messages.save(data);
        //Enviamos los mensajes a todos los sockets que esten conectados.
        io.sockets.emit("messagesChat", await normalizarMensajes())
    })
})

//Rutas
app.get("/", async (req, res) => {
    res.render("home", {
        products: products,
        messages: messages
    })
})

app.get("/api/productos-test", async(req,res)=>{
    let randomProducts = [];
    for(let i = 0; i<5; i++){
        randomProducts.push({
            product: commerce.product(),
            price: commerce.price(),
            image:image.image()
        })
    }
    res.render("randomProducts",{
        products:randomProducts
    })
})

