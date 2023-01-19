export const randomNumbers = (cantidad) =>{
    let numeros = []
    let numerosFinales = []
    for(let i = 0; i<cantidad; i++){
        const numeroRandom = parseInt(Math.random()*1000)+ 1;
        numeros.push(numeroRandom)
    }
    let numerosOrdenados = numeros.sort((a,b)=> a-b);

    let noRepetidos = [];
    let contadorRepetidos = 1;
    let almacenadorVecesRepetidas = [];

    for(let i = 0; i< numerosOrdenados.length; i++){
        if(numerosOrdenados[i+1] === numerosOrdenados[i]){
            contadorRepetidos ++;
        }else{
            noRepetidos.push(numerosOrdenados[i]);
            almacenadorVecesRepetidas.push(contadorRepetidos)
            contadorRepetidos = 1;
        }
    }

    for(let i = 0; i<noRepetidos.length; i++){
        const objeto = {Numero: noRepetidos[i], Repeticiones:almacenadorVecesRepetidas[i]}
        numerosFinales.push(objeto);
    }

    return numerosFinales;
}