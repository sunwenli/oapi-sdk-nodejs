const OapiCore = require("@larksuiteoapi/core");
const OapiCard = require("@larksuiteoapi/card")
// for online
// import {GetConfig} from "../config/config";
// const conf = GetConfig(...)

// for test
const conf = OapiCore.getTestInternalConf("online")

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

// startup card http server by express, port: 8089
OapiCard.startServer(conf, 8089)