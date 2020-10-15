
const OapiCore = require("@larksuite/oapi-core");
const OapiCard = require("@larksuite/oapi-card")
const express = require('express');
const bodyParser = require('body-parser');
import {GetConfig} from "../config/config";

const conf = GetConfig(...)

// set handler
OapiCard.setHandler(conf, (ctx, card) => {
    let conf = OapiCore.getConfigByCtx(ctx);
    console.log(conf);
    console.log("----------------");
    console.log(ctx.getRequestID());
    console.log(card)
    return {
        "test": "1"
    }
})

// startup card http server by express, port: 8080
const app = express();

app.use(bodyParser());

app.post('/webhook/card', (req, res) => {
    const request = new OapiCore.Request()
    Object.entries(req.headers).forEach(([k, v]) => {
        request.headers[k] = v
    })
    request.body = req.body
    OapiCard.httpHandle(conf, request, undefined).then(response => {
        res.status(response.statusCode).send(response.body)
    })
});

app.listen(8089, () => {
    console.log(`listening at :8089`)
})