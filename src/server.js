import express, { query } from "express";
import handlebars from "express-handlebars";
import {Server} from "socket.io";
import {ContenedorMysql} from "./managers/contenedorMysql.js";
import { options } from "./config/databaseConfig.js"
import path from 'path';
import { fileURLToPath } from 'url';
import __dirname from "./util.js";
import {faker} from "@faker-js/faker";
import { Contenedor } from "./index.js";
import { normalize, schema } from "normalizr";
import session from "express-session";
import cookieParser from "cookie-parser";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { userModel } from "./models/user.js";
import bcrypt from "bcryptjs";
import  parseArgs  from "minimist";
import { randomNumbers } from "./randoms.js";
import { fork } from "child_process";
import cluster from "cluster";
import os from "os";
import compression from "compression";
import log4js from "log4js";

const argOptions = {default:{p:8080, m:"FORK"}};

const argumentos = parseArgs(process.argv.slice(2), argOptions);

faker.locale = "es";

//Conexion a base mongoose
mongoose.connect(`mongodb+srv://valenspinaci:Valentino26@backend-coder.ksqybs9.mongodb.net/proyectoFinal?retryWrites=true&w=majority`,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (error)=>{
    if(error) console.log(error)
})

const {commerce, image} = faker;


const app = express();

const products = new ContenedorMysql(options.mariaDB, "productos");
const messages = new Contenedor("src/DB/chat.txt");

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"))
app.use(compression())

const PORT = process.env.PORT || argumentos.p;
const MODO = argumentos.m;

//Logica del cluster
if(MODO === "CLUSTER" && cluster.isPrimary){
    const numCpus = os.cpus().length;
    for(let i = 0; i<numCpus; i++){
        cluster.fork()
    }
    cluster.on("exit",(worker)=>{
        console.log(`El proceso ${worker.process.pid} ha dejado de funcionar`);
        cluster.fork()
    })
}else{
    const server = app.listen(PORT, () => console.log(`Servidor inicializado en el puerto ${PORT} y proceso ${process.pid}`));
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

    //Chat
    //Enviar los mensajes al cliente
    socket.emit("messagesChat", await normalizarMensajes());
    //Recibimos el mensaje
    socket.on("newMsg", async (data) => {
        await messages.save(data);
        //Enviamos los mensajes a todos los sockets que esten conectados.
        io.sockets.emit("messagesChat", await normalizarMensajes())
    })
})

    //Normalizacion
    const authorSchema = new schema.Entity("authors",{},{idAttribute:"email"})
    const messageSchema = new schema.Entity("messages",{
    author:authorSchema
    })

    //Esquema global
    const chatSchema = new schema.Entity("chats",{
        messages:[messageSchema]
    })

    //Aplicar normalizacion
    //Funcion que normaliza datos
    const normalizarData = (data)=>{
        const dataNormalizada = normalize({id:"chatHistory", messages:data}, chatSchema)
        return dataNormalizada;
    }
    //Funcion que normaliza mensajes
    const normalizarMensajes = async()=>{
        const messagesChat = await messages.getAll()
        const mensajesNormalizados = normalizarData(messagesChat);
        return mensajesNormalizados;
    }
}


//Configurar servidor para indicarle que usaremos motor de plantillas
app.engine("handlebars", handlebars.engine());

//Indicar donde están las vistas
app.set("views", __dirname + "/views");

//Indicar el motor que usaré en express
app.set("view engine", "handlebars");

//Cookie parser
app.use(cookieParser());

//Configuracion de la sesion
app.use(session({
    store: MongoStore.create({
        mongoUrl: options.mongoAtlas.urlDB,
    }),
    secret: "claveSecreta",
    resave: false,
    saveUninitialized: false,
    cookie:{maxAge:600000}
}))

//Vinculacion de passport con el servidor
app.use(passport.initialize());
app.use(passport.session());

//Config serializacion y deserializacion
passport.serializeUser((user,done)=>{
    return done(null, user.id)
})
passport.deserializeUser((id, done)=>{
    //Con id buscamos usuario en base de datos para traer info
    userModel.findById(id, (error, user)=>{
        return done(error, user)
    })
})

//Estrategia de registro
passport.use("signupStrategy", new LocalStrategy(
    {
        passReqToCallback: true,
        usernameField: "mail"
    },
    async (req, username, password,done)=>{
        const cryptoPassword = await bcrypt.hash(password,8);
        userModel.findOne({mail:username},(error, user)=>{
            if(error) return done(error, false, {message:"Hubo un error"});
            if(user) return done(error, false, {message:"El usuario ya existe"})
            const newUser = {
                mail: username,
                password: cryptoPassword,
                name:req.body.name,
                adress: req.body.adress,
                age:req.body.age,
                phone:req.body.phone
            };
            userModel.create(newUser, (error, userCreated)=>{
                if(error) return done (error, null, {message:"El usuario no pudo ser creado"})
                return done (null, userCreated)
            })
        })
    }
))

passport.use("loginStrategy", new LocalStrategy(
    {
        passReqToCallback:true,
        usernameField: "mail"
    },
    (req,username,password,done)=>{
        userModel.findOne({mail:username}, (error,user)=>{
            if(error) return done (error, false, {message: "Ha ocurrido un error"})
            if(user){
                let compare = bcrypt.compareSync( password, user.password );
                if(compare){
                    return done (null, user)
                }else{
                    return done (error, false, {message:"La contraseña es incorrecta"})
                }
            }else{
                return done (error, false, {message: "El correo no ha sido encontrado"})
            }
        })
    }
))

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

//Funcion para detectar rutas desconocidas
const unknownEndpoint = (req, res) => {
    logger = log4js.getLogger("warns")
    res.status(404).send({ error: 'Ruta desconocida' })
    logger.warn(`Ruta: ${req.url}, Metodo:${req.method}`)
}

//Rutas
app.get("/", async (req, res) => {
    if(req.session.passport){
        await res.render("home", {
            products: products,
            messages: messages,
            user: req.session.passport.username
        })
    }else{
        res.redirect("/login")
    }
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
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
    if(req.session.passport){
        res.render("randomProducts",{
            products:randomProducts
        })
    }else{
        res.redirect("/login")
    }
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/signup", (req,res)=>{
    if(req.session.passport){
        res.redirect("/")
    }else{
        res.render("signup")
    }
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.post("/signup", passport.authenticate("signupStrategy", {
    failureRedirect: "/failSignup",
    failureMessage: true
}) ,(req,res)=>{
    const {mail} = req.body;
    req.session.passport.username = mail;
    res.redirect("/")
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/failSignup", (req,res)=>{
    res.render("failSignup")
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/login", (req,res)=>{
    if(req.session.passport){
        res.redirect("/")
    }else{
        res.render("login")
    }
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.post("/login", passport.authenticate("loginStrategy", {
    failureRedirect: "/failLogin",
    failureMessage: true
}) ,(req,res)=>{
    const {mail} = req.body;
    req.session.passport.username = mail;
    res.redirect("/")
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/failLogin", (req,res)=>{
    res.render("failLogin")
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/logout", (req,res)=>{
    const user = req.session.passport.username;
    req.session.destroy(error=>{
        if(error) return res.redirect("/home");
        res.render("logout", {user:user})
    })
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/info", (req,res)=>{
    res.json({
        "Argumentos de entrada": process.argv.slice(2),
        "Sistema operativo" : process.platform,
        "Version Node": process.version,
        "Memoria reservada" : process.memoryUsage(),
        "Path": process.title,
        "Process ID": process.pid,
        "Carpeta": process.cwd()
    })
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/info-console", (req,res)=>{
    console.log(`Argumentos de entrada: ${process.argv.slice(2)},
    Sistema operativo : ${process.platform},
    Version Node: ${process.version},
    Memoria reservada : ${process.memoryUsage()},
    Path: ${process.title},
    Process ID: ${process.pid},
    Carpeta: ${process.cwd()}`)
    res.json({
        "Argumentos de entrada": process.argv.slice(2),
        "Sistema operativo" : process.platform,
        "Version Node": process.version,
        "Memoria reservada" : process.memoryUsage(),
        "Path": process.title,
        "Process ID": process.pid,
        "Carpeta": process.cwd()
    })
    logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.get("/api/randoms", (req,res)=>{
        //let {cant} = req.query
        //const child = fork("src/child.js")
        //child.on("message",(childMsg)=>{
        //    if(childMsg == "Hijo listo"){
        //        child.send("Iniciar")
        //    }else{
        if(cant){
            res.json(randomNumbers(cant))
        }else{
            cant = 100000000;
            res.json(randomNumbers(cant));
        }
        //    }
        //})
        logger.info(`Ruta: ${req.route.path}, Metodo:${req.route.stack[0].method}`)
})

app.use(unknownEndpoint);