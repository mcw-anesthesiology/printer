/** @format */

const jsonBody = require('body/json');
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const { NODE_ENV } = process.env;

const ALLOWED_ORIGINS = [
	/\.residentprogram\.com/,
	/\.mcw-anesthesiology\.tech/,
	/\.mcw-anesth\.tech/,
	/\.mcwanet\.com/
];


module.exports = (req, res) =>
	jsonBody(req, res, async (err, { body, styles = [] }) => {
		try {
			if (err) throw err;

			if (NODE_ENV === 'development') {
				res.setHeader('Access-Control-Allow-Origin', '*');
			} else {
				if (ALLOWED_ORIGINS.some(origin => origin.test(req.headers.origin))) {
					res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
				} else {
					throw new Error('Disallowed origin');
				}
			}


			const browser = await puppeteer.launch({
				args: chrome.args,
				executablePath: await chrome.executablePath,
				headless: chrome.headless
			});

			const page = await browser.newPage();
			await page.setContent(body);
			await Promise.all(
				styles.map(style =>
					page.addStyleTag(style).catch(err => {
						console.error(err);
					})
				)
			);
			const pdf = await page.pdf({
				format: 'Letter',
				landscape: true,
				margin: {
					top: '0.5in',
					right: '0.5in',
					bottom: '0.5in',
					left: '0.5in',
				}
			});

			await browser.close();

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/pdf');
			res.end(pdf);
		} catch (err) {
			console.error(err);
			res.statusCode = 500;
			res.end();
			return;
		}
	});
