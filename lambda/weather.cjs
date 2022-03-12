const axios = require("axios");
const select = require('soupselect').select;
const htmlparser = require("htmlparser");

const appid = process.env.appid;

const parseMeteociel = (data) => {
    return new Promise((resolve) => {
        const handler = new htmlparser.DefaultHandler((err, dom) => {
            const lines = select(select(dom, 'table[bordercolor="#a0a0b0"]'), 'tr');
            const r = lines
                .filter(l => !l.attribs)
                .slice(0, 4)
                .map((l, i) => {
                    try {
                        const items = select(l, 'td');
                        if (i === 0) items.shift();
                        const w = (i) => `${items[i].children[0].attribs.alt.split(':')[0]} ${items[i].children[1].raw} km/h`;
                        const t = (i) => items[i].children[0].raw;
                        const time = t(0);
                        const windSurface = w(12);
                        const wind1500 = w(13);
                        const wind3000 = w(15);
                        const wind5000 = w(17);
                        const pressure = t(19);
                        const iso0 = `${t(21)}m`;
                        return {time, windSurface, wind1500, wind3000, wind5000, pressure, iso0};
                    } catch (e) {
                        return {time: '--'};
                    }
                });
            const l = r.find((v) => v.time === '13:00') ?? r[0];
            resolve(l ?? {});
        });
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(data);
    });
}

const meteociel = () => {
    return axios.get('https://www.meteociel.fr/previsions-haute-altitude/1655/la_motte_du_caire.htm')
        .then(html => parseMeteociel(html.data));
}

const openweather = async (lat, lon) => {
    const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${appid}&units=metric`);
    console.log(r.data);
    const {pressure, temp} = r.data.main;
    const sunset = new Date(r.data.sys.sunset * 1000).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris'});
    return {pressure, temp, sunset};
}

exports.handler = async (event) => {
    const {lat, lon} = event.queryStringParameters;
    const {pressure, temp, sunset} = await openweather(lat, lon);
    // const pressure= 1, temp= 1, sunset= 1;
    const {windSurface, wind1500, wind3000, wind5000, iso0} = await meteociel();

    const response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "https://sebastienchauvin.github.io",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        body: JSON.stringify({pressure, temp, sunset, windSurface, wind1500, wind3000, wind5000, iso0}),
    };
    return response;
};

// -------------------------------------------------------------------------------------------------------


// const fs = require('fs'); // DEBUG
//
// fs.readFile('motte.html', (err, data) => {
//     d = parseMeteociel(data).then((d) => {
//         console.log(d);
//     });
// })
// return 0;

const event = {
    "resource": "/glider_weather",
    "path": "/glider_weather",
    "httpMethod": "GET",
    "headers": {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-GB,en;q=0.9,fr;q=0.8",
        "Host": "sk7uyl0qc1.execute-api.eu-west-3.amazonaws.com",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36",
        "X-Amzn-Trace-Id": "Root=1-622cd079-3324f78a09087caa2b66d66c",
        "X-Forwarded-For": "91.171.0.240",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https"
    },
    "multiValueHeaders": {
        "accept": ["text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"],
        "accept-encoding": ["gzip, deflate, br"],
        "accept-language": ["en-GB,en;q=0.9,fr;q=0.8"],
        "Host": ["sk7uyl0qc1.execute-api.eu-west-3.amazonaws.com"],
        "sec-ch-ua": ["\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\""],
        "sec-ch-ua-mobile": ["?0"],
        "sec-ch-ua-platform": ["\"macOS\""],
        "sec-fetch-dest": ["document"],
        "sec-fetch-mode": ["navigate"],
        "sec-fetch-site": ["none"],
        "sec-fetch-user": ["?1"],
        "upgrade-insecure-requests": ["1"],
        "User-Agent": ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36"],
        "X-Amzn-Trace-Id": ["Root=1-622cd079-3324f78a09087caa2b66d66c"],
        "X-Forwarded-For": ["91.171.0.240"],
        "X-Forwarded-Port": ["443"],
        "X-Forwarded-Proto": ["https"]
    },
    "queryStringParameters": {"lat": "44.3248", "lon": "6.0329"},
    "multiValueQueryStringParameters": {"lat": ["44.3248"], "lon": ["6.0329"]},
    "pathParameters": null,
    "stageVariables": null,
    "requestContext": {
        "resourceId": "j5auz9",
        "resourcePath": "/glider_weather",
        "httpMethod": "GET",
        "extendedRequestId": "O4WDDFukiGYFt6Q=",
        "requestTime": "12/Mar/2022:16:55:21 +0000",
        "path": "/default/glider_weather",
        "accountId": "037588429591",
        "protocol": "HTTP/1.1",
        "stage": "default",
        "domainPrefix": "sk7uyl0qc1",
        "requestTimeEpoch": 1647104121714,
        "requestId": "626291d1-a75b-4ce0-af05-c61966875d0b",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "sourceIp": "91.171.0.240",
            "principalOrgId": null,
            "accessKey": null,
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36",
            "user": null
        },
        "domainName": "sk7uyl0qc1.execute-api.eu-west-3.amazonaws.com",
        "apiId": "sk7uyl0qc1"
    },
    "body": null,
    "isBase64Encoded": false
};

exports.handler(event).then((r) => console.log(r));