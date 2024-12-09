require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Pool } = require("pg");

// Cargar archivo .proto
const PROTO_PATH = "./product.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const ProductService = grpc.loadPackageDefinition(packageDefinition).ProductService;

// Configuración de la base de datos
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Implementación de funciones gRPC
const productService = {
  CreateProduct: async (call, callback) => {
    const { nombre, sku, descripcion, precio, imagen } = call.request;
    try {
      const result = await pool.query(
        "INSERT INTO productos (nombre, sku, descripcion, precio, imagen) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [nombre, sku, descripcion, precio, imagen]
      );
      callback(null, result.rows[0]);
    } catch (err) {
      callback(err, null);
    }
  },
  GetProductById: async (call, callback) => {
    const { id } = call.request;
    try {
      const result = await pool.query("SELECT * FROM productos WHERE id = $1", [id]);
      if (result.rows.length > 0) {
        callback(null, result.rows[0]);
      } else {
        callback({ code: grpc.status.NOT_FOUND, message: "Producto no encontrado" });
      }
    } catch (err) {
      callback(err, null);
    }
  },
  ListProducts: async (_, callback) => {
    try {
      const result = await pool.query("SELECT * FROM productos");
      callback(null, { productos: result.rows });
    } catch (err) {
      callback(err, null);
    }
  },
  UpdateProduct: async (call, callback) => {
    const { id, nombre, sku, descripcion, precio, imagen } = call.request;
    try {
      const result = await pool.query(
        "UPDATE productos SET nombre = $1, sku = $2, descripcion = $3, precio = $4, imagen = $5 WHERE id = $6 RETURNING *",
        [nombre, sku, descripcion, precio, imagen, id]
      );
      if (result.rows.length > 0) {
        callback(null, result.rows[0]);
      } else {
        callback({ code: grpc.status.NOT_FOUND, message: "Producto no encontrado" });
      }
    } catch (err) {
      callback(err, null);
    }
  },
  DeleteProduct: async (call, callback) => {
    const { id } = call.request;
    try {
      const result = await pool.query("DELETE FROM productos WHERE id = $1", [id]);
      if (result.rowCount > 0) {
        callback(null, {});
      } else {
        callback({ code: grpc.status.NOT_FOUND, message: "Producto no encontrado" });
      }
    } catch (err) {
      callback(err, null);
    }
  },
};

// Crear servidor gRPC
const server = new grpc.Server();
server.addService(ProductService.service, productService);

const PORT = 50051;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Servidor gRPC ejecutándose en el puerto ${PORT}`);
  server.start();
});
