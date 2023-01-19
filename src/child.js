import { randomNumbers } from "./randoms.js"

process.send("Hijo listo")

process.on("message", (parentMsg)=>{
    if(parentMsg == "Iniciar"){
        const numeros = randomNumbers()
        process.send(numeros)
    }
})