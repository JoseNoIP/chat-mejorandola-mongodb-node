//Dependencias que vamos a requirir
var http = require('http'),
  io = require('socket.io'),
  fs = require('fs'),
  MongoClient = require('mongodb').MongoClient,
  base = require('mongodb').Server

// datos para realizar la conexion con mongodb

var host = "localhost";
var puertobase = 27017;

//Clase auxiliar para manejar la interracion con el bus de mensajes
conexiondemensaje = function (coleccion) {

    // informacion para la coleccion
    this.ingresar = function (mensaje, usuario, llamada) {

        var datos = {
            "usuario" : usuario,
            "mensaje" : mensaje
        };

        coleccion.insert(datos, function (err, docinsertado) {
            llamada (null, docinsertado);
        });
    }
}

// poder conectar a mongodb
canal = function () { }
canal.connect = function (host, puertobase, llamada) {

    // conexion para conectar a mongodb
    var cliente = new MongoClient(new base(host, puertobase, {}), { "w" : 1 });

    // abrimos conexion para la base de datos
    cliente.open(function (err, mongoclient) {

        // creamos la base de datos
        var db = cliente.db("chat");

        // obtenemos los mensajes y creamos la coleccion
        db.createCollection('mensajes', function(err, coleccion) {
            llamada(new conexiondemensaje(coleccion));
        });
    });
}

canal.connect(host, puertobase, function (conexiondemensaje) {

    // creamos un servidor simple para el index.html
    server = http.createServer(function(req, res){
        res.writeHead(200, {'Content-Type': 'text/html'});
        // colocamos ubicacion de nuestro index y lo mandamos al cliente
        var salida = fs.readFileSync('./index.html', 'utf8');
        res.end(salida);
    });

// iniciamos un socket en nuestro servidor
    var socket = io.listen(server);

    // iniciacion la conexion para los usuarios que accesen
    socket.on('connection', function (cliente) {

        // registramos el nick en el chat inmediatamente conecte
        cliente.on('establecerusuario', function (usuario) {

            cliente.set('nombreusuario', usuario.nombreusuario, function () {

             console.log("Ingreso el usuario = " + usuario.nombreusuario);   

            });
        });

        // recibimos mensaje del cliente
        cliente.on('mensaje', function (msj) {

            cliente.get('nombreusuario', function (err, usuario) {

                // mostramos mensaje a los demas usuarios
                conexiondemensaje.ingresar(msj.mensaje, usuario, function (err) {

                    cliente.broadcast.emit("mensaje", {
                        "usuario" : usuario,
                        "mensaje" : msj.mensaje
                    });

                    console.log("Mensaje de " + usuario + " insertado correctamente");
                });

            });
        });
   
    });

    console.log("servidor corriendo en puerto 8080 ");
    server.listen(8080);
});