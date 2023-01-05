console.log("JS home view");

const socketClient = io();

//Productos
const productForm = document.getElementById("productForm");
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const product = {
        title: document.getElementById("title").value,
        price: document.getElementById("price").value,
        thumbnail: document.getElementById("thumbnail").value
    };
    await socketClient.emit("newProduct", product);
    productForm.reset()
})

const productsContainer = document.getElementById("productsContainer");

socketClient.on("products", async (data) => {
    console.log(data)
    const templateTable = await fetch("./templates/table.handlebars")
    const templateFormat = await templateTable.text();
    const template = Handlebars.compile(templateFormat);
    const html = template({
        products: data
    });
    productsContainer.innerHTML = html;
})

//Denormalizacion
const authorSchema = new normalizr.schema.Entity("authors",{},{idAttribute:"email"})//Id con el valor del campo email
const messageSchema = new normalizr.schema.Entity("messages",{
    author:authorSchema
})

//Esquema global
const chatSchema = new normalizr.schema.Entity("chats",{
    messages:[messageSchema]
})

//Chat
const chatContainer = document.getElementById("chatContainer");
const compresion = document.getElementById("porcentajeCompresion");

socketClient.on("messagesChat", (data) => {
    const compresionNormalizada = ("Data normalizada: ", JSON.stringify(data, null, "\t").length);
    const dataMsg = normalizr.denormalize(data.result, chatSchema, data.entities);
    const compresionNormal = ("Data normal: ", JSON.stringify(dataMsg, null, "\t").length);
    const porcentajeCompresion = (parseInt(100 - (compresionNormalizada/compresionNormal*100)))
    let message = " ";
    dataMsg.messages.forEach(element => {
        message += `<p><span style="font-weight:bold; color:blue">${element.author.nombre}</span> [<span style="color:brown">${element.date}</span>] : <span style="color:green; font-style:italic">${element.text}</span></p>`
    });
    chatContainer.innerHTML = message;
    compresion.innerHTML = `<h3>Porcentaje de compresión de datos: ${porcentajeCompresion}%</h3>`
})

//Capturar el nombre de usuario
let user = "";

Swal.fire({
    title: 'Formulario login',
    html: `<input type="email" id="email" class="swal2-input" placeholder="Mail">
    <input type="text" id="nombre" class="swal2-input" placeholder="Nombre">
    <input type="text" id="apellido" class="swal2-input" placeholder="Apellido">
    <input type="number" id="edad" class="swal2-input" placeholder="Edad">
    <input type="text" id="alias" class="swal2-input" placeholder="Alias">
    <input type="text" id="avatar" class="swal2-input" placeholder="URL avatar">`,
    confirmButtonText: 'Continuar',
    focusConfirm: false,
    preConfirm: () => {
        const email = Swal.getPopup().querySelector('#email').value
        const nombre = Swal.getPopup().querySelector('#nombre').value
        const apellido = Swal.getPopup().querySelector('#apellido').value
        const edad = Swal.getPopup().querySelector('#edad').value
        const alias = Swal.getPopup().querySelector('#alias').value
        const avatar = Swal.getPopup().querySelector('#avatar').value
        if (!email || !nombre || !apellido || !edad || !alias || !avatar) {
        Swal.showValidationMessage(`Por favor complete todos los campos`)
        }
        return { email, nombre, apellido, edad, alias, avatar }
    },
    allowOutsideClick: false
    }).then((result) => {
    Swal.fire(`
        Email: ${result.value.email}
        Nombre: ${result.value.nombre}
        Apellido: ${result.value.apellido}
        Edad: ${result.value.edad}
        Alias: ${result.value.alias}
        Avatar: ${result.value.avatar}
    `.trim())
    user = result.value;
    })

//Enviar un mensaje a nuestro servidor
const chatForm = document.getElementById("chatForm");
const messageChat = document.getElementById("messageChat");

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log("Mensaje enviado")
    //Envia nuevo mensaje
    socketClient.emit("newMsg", {
        author: user,
        date: new Date().toLocaleString(),
        text: messageChat.value
    });
    chatForm.reset();
})