/** @format */

const jsonBody = require('body/json');
const chrome = require('chrome-aws-lambda');

const { NODE_ENV } = process.env;

const ALLOWED_ORIGINS = [
	/\.residentprogram\.com/,
	/\.mcw-anesthesiology\.tech/,
	/\.mcw-anesth\.tech/,
	/\.mcwanet\.com/,
];

module.exports = (req, res) =>
	jsonBody(req, res, async (err, { body, styles = [], options = {} }) => {
		try {
			if (err) throw err;

			if (NODE_ENV === 'development') {
				res.setHeader('Access-Control-Allow-Origin', '*');
			} else {
				if (
					ALLOWED_ORIGINS.some(origin =>
						origin.test(req.headers.origin)
					)
				) {
					res.setHeader(
						'Access-Control-Allow-Origin',
						req.headers.origin
					);
				} else {
					throw new Error('Disallowed origin');
				}
			}

			const browser = await chrome.puppeteer.launch({
				args: chrome.args,
				defaultViewport: chrome.defaultViewport,
				executablePath: await chrome.executablePath,
				headless: chrome.headless,
				ignoreHTTPSErrors: true,
			});

			const page = await browser.newPage();
			await Promise.all([
				page.setContent(body),
				...styles.map(style =>
					page.addStyleTag(style).catch(err => {
						console.error(err);
					})
				),
				new Promise(resolve => page.once('load', resolve)),
				new Promise(resolve => setTimeout(resolve, 2000)),
			]);

			const pdf = await page.pdf({
				format: 'Letter',
				margin: {
					top: '0.5in',
					right: '0.5in',
					bottom: '0.5in',
					left: '0.5in',
				},
				...options,
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
