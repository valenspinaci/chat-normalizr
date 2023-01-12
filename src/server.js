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
import session from "express-session";
import cookieParser from "cookie-parser";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { userModel } from "./models/user.js";
import bcrypt from "bcryptjs"

faker.locale = "es"

//Conexion a base mongoose
mongoose.connect("mongodb+srv://valenspinaci:Valentino26@backend-coder.ksqybs9.mongodb.net/proyectoFinal?retryWrites=true&w=majority",{
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (error)=>{
    if(error) console.log("Conexión fallida")
    console.log("Base de datos conectada")
})

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
    async (req, username, password, done)=>{
        const cryptoPassword = await bcrypt.hash(password,8)
        userModel.findOne({mail:username},(error, user)=>{
            if(error) return done(error, false, {message:"Hubo un error"});
            if(user) return done(error, false, {message:"El usuario ya existe"})
            const newUser = {
                mail: username,
                password: cryptoPassword
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

//Rutas
app.get("/home", async (req, res) => {
    //console.log(req.session)
    if(req.session.passport){
        await res.render("home", {
            products: products,
            messages: messages,
            user: req.session.passport.username
        })
    }else{
        res.redirect("/login")
    }
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
})

app.get("/signup", (req,res)=>{
    if(req.session.passport){
        res.redirect("/home")
    }else{
        res.render("signup")
    }
})

app.post("/signup", passport.authenticate("signupStrategy", {
    failureRedirect: "/failSignup",
    failureMessage: true
}) ,(req,res)=>{
    const {mail} = req.body;
    req.session.passport.username = mail;
    res.redirect("/home")
})

app.get("/failSignup", (req,res)=>{
    res.render("failSignup")
})

app.get("/login", (req,res)=>{
    if(req.session.passport){
        res.redirect("/home")
    }else{
        res.render("login")
    }
})

app.post("/login", passport.authenticate("loginStrategy", {
    failureRedirect: "/failLogin",
    failureMessage: true
}) ,(req,res)=>{
    const {mail} = req.body;
    req.session.passport.username = mail;
    res.redirect("/home")
})

app.get("/failLogin", (req,res)=>{
    res.render("failLogin")
})

app.get("/logout", (req,res)=>{
    const user = req.session.passport.username;
    req.session.destroy(error=>{
        if(error) return res.redirect("/home");
        res.render("logout", {user:user})
    })
})