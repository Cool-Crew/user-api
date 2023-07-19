const chatServer = require("./service/socketIO");
const HTTP_PORT =process.env.PORT || 8080 ;


chatServer.server.listen(HTTP_PORT, () => {
    console.log("API listening on port: changes " + HTTP_PORT);
});