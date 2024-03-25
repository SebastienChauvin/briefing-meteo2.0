const axios = require("axios");
const select = require('soupselect').select;
const htmlparser = require("htmlparser");

const appid = process.env.appid;

const parseMeteoParapente = (data) => {
    const {tc, z, ter, pblh} = Object.values(data.data)[0];
    const findTemp = (t) => tc.findIndex(v => v <= t);

    return {temp: tc[0], iso0: z[findTemp(0)], isoM10: z[findTemp(-10)], plafond: ter + pblh};
}

const meteoParapenteSounding = async (run, date, time, lat, lon) => {
    return axios.get(`https://data0.meteo-parapente.com/data2017.php?run=${run}&location=${lat},${lon}&date=${date}&plot=sounding&time=${time}`)
}

const meteoParapenteRuns = async () => {
    return axios.get(`https://data0.meteo-parapente.com/status.php?refresh=${Date.now()}`).then(body => body.data.france);
}

const meteoParapente = async (lat, lon) => {
    return meteoParapenteRuns().then(runs => {
        const f = Intl.NumberFormat('en-US', {minimumIntegerDigits: 2});
        const n = new Date();
        const day = `${n.getFullYear()}${f.format(n.getMonth() + 1)}${f.format(n.getDate())}`;
        const run = runs.find(r => r.status === 'complete' && r.day === day);
        // Time in UTC
        return meteoParapenteSounding(run.run, `${day}120000`, '12:00', lat, lon).then(result => parseMeteoParapente(result.data));
    });
}
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
                        const w = (i) => `${items[i].children[0].attribs.alt.split(':')[0].trim()} ${(Math.floor(((items[i].children[1].raw / 1.852) + 4) / 5) * 5)} kt`;
                        const t = (i) => items[i]?.children?.[0]?.children?.[0]?.raw ?? items[i]?.children?.[0]?.raw;
                        const temp = t(1);
                        const temp3000 = t(4);
                        const temp5000 = t(6);
                        const time = t(0);
                        const windSurface = w(12);
                        const wind1500 = w(13);
                        const wind3000 = w(15);
                        const wind5000 = w(17);
                        const pressure = t(19);
                        const iso0 = `${t(21)}m`;
                        return {
                            time,
                            temp,
                            temp3000,
                            temp5000,
                            windSurface,
                            wind1500,
                            wind3000,
                            wind5000,
                            pressure,
                            iso0
                        };
                    } catch (e) {
                        console.error(e);
                        return {time: '--'};
                    }
                });
            const l = r.find((v) => v.time === '14:00') ?? r.find((v) => v.time === '13:00') ?? r[r.length - 2];
            resolve(l ?? {});
        });
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(data);
    });
}

const meteociel = () => {
    return axios.get('https://www.meteociel.fr/previsions-haute-altitude-arome/1655/la_motte_du_caire.htm')
        .then(html => parseMeteociel(html.data));
}

const openweather = async (lat, lon) => {
    const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${appid}&units=metric`);
    const {pressure, temp, clouds} = r.data.main;
    const sunset = new Date(r.data.sys.sunset * 1000).toLocaleTimeString('fr-FR', {timeZone: 'Europe/Paris'});
    return {pressure, temp, sunset, clouds};
}

exports.handler = async (event) => {
    const {lat, lon, sources} = event.queryStringParameters;
    const sourceList = (sources ?? 'ow,mc,mp').split(',');
    const [ow, mc, mp] = await Promise.all([
        sourceList.includes('ow') ? openweather(lat, lon).catch(() => {}) : {},
        sourceList.includes('mc') ? meteociel().catch(() => {}) : {},
        sourceList.includes('mp') ? meteoParapente(lat, lon).catch(() => {}) : {}
    ]);
    const result = {...ow, ...mc, ...mp};

    const response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "https://sebastienchauvin.github.io",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        body: JSON.stringify(result),
    };
    return response;
};

// -------------------------------------------------------------------------------------------------------

// const fs = require('fs'); // DEBUG
//
// fs.readFile('sounding.json', (err, data) => {
//     d = parseMeteoParapente(data);
//     console.log(d);
// })
// return 0;

// const fs = require('fs'); // DEBUG
//
// fs.readFile('motte.html', (err, data) => {
//     d = parseMeteociel(data).then((d) => {
//         console.log(d);
//     });
// })
// return 0;

//
// let lat = `44.4014`;
// let lon = `6.3817`;
// meteoParapente(lat, lon).then(d => console.log(d));
//
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
