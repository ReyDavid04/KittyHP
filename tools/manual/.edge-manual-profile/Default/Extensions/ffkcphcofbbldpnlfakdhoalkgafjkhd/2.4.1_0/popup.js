const free_devices =  ['mobile', 'desktop', 'highEndLaptop', 'ipad102', 'galaxyTabS7', 'iphone13ProMax', 'macbookAirM1', 'redmiNote8Pro', 'galaxyA50', 'redmi5A'];
const starter_devices = [...free_devices, 'iphone11', 'galaxyJ8', 'motoG5', 'iphone7', 'galaxyS10Plus', 'jioPhone2', 'iphoneSE', 'iphoneXR', 'oneplusNord2', 'ipadMini2021'];
const growth_devices = [...starter_devices, 'desktopQHD', 'iphone5', 'iphone14pro', 'galaxyFold2', 'surfaceDuo2'];
const pro_devices = [...growth_devices, 'pixel6Pro', 'ipadPro11', 'iphone14ProMax', 'pixel5', 'galaxyS22Ultra'];
const free_locations = ['us', 'ca', 'br', 'de', 'uk', 'nl', 'in', 'jp', 'au', 'id'];
const starter_locations = [...free_locations, 'pl', 'ch', 'sg', 'kr', 'tw', 'us2', 'us3', 'es', 'fi', 'il'];
const growth_locations = [...starter_locations, 'cl', 'it', 'fr', 'be', 'us4', 'us5', 'hk', 'in2', 'us6', 'au2'];
const pro_locations = [...growth_locations, 'us7', 'us8', 'ca2', 'us9', 'jp2'];

const available_devices = {
	legacyMobile:   { name: 'Mobile(Legacy)',           type: "standard"},
	mobile:         { name: 'Mobile',                   type: "standard"},
	desktop:        { name: 'Desktop',                  type: "standard"},
	macbookAirM1:   { name: 'MacBook Air (2020)',       type: "desktop"},
	highEndLaptop:  { name: 'High-End Laptop',          type: "desktop"},
	ipad102:        { name: 'iPad 10.2',                type: "tablet"},
	galaxyTabS7:    { name: 'Samsung Galaxy Tab S7',    type: "tablet"},
	iphone13ProMax: { name: 'iPhone 13 Pro Max',        type: "mobile"},
	iphone11:       { name: 'iPhone 11',                type: "mobile"},
	galaxyS10Plus:  { name: 'Samsung Galaxy S10+',      type: "mobile"},
	redmiNote8Pro:  { name: 'Xiaomi Redmi Note 8 Pro',  type: "mobile"},
	iphone7:        { name: 'iPhone 7',                 type: "mobile"},
	galaxyA50:      { name: 'Samsung Galaxy A50',       type: "mobile"},
	galaxyJ8:       { name: 'Samsung Galaxy J8',        type: "mobile"},
	motoG5:         { name: 'Motorola Moto G5',         type: "mobile"},
	redmi5A:        { name: 'Xiaomi Redmi 5A',          type: "mobile"},
	jioPhone2:      { name: 'Jio Phone 2',              type: "mobile"},
	iphoneSE:       { name: 'iPhone SE (2020)',         type: "mobile"},
	iphoneXR:       { name: 'iPhone XR',                type: "mobile"},
	oneplusNord2:   { name: 'OnePlus Nord 2',           type: "mobile"},
	ipadMini2021:   { name: 'iPad Mini (2021)',         type: "tablet"},
	desktopQHD:     { name: 'Desktop QHD',              type: "desktop"},
	iphone5:        { name: 'iPhone 5',                 type: "mobile"},
	iphone14pro:    { name: 'iPhone 14 Pro',            type: "mobile"},
	galaxyFold2:    { name: 'Galaxy Fold 2',            type: "mobile"},
	surfaceDuo2:    { name: 'Surface Duo 2',            type: "tablet"},
	pixel6Pro:      { name: 'Pixel 6 Pro',              type: "mobile"},
	ipadPro11:      { name: 'iPad Pro 11 (2022)',       type: "tablet"},
	iphone14ProMax: { name: 'iPhone 14 Pro Max',        type: "mobile"},
	pixel5:         { name: 'Pixel 5',                  type: "mobile"},
	galaxyS22Ultra: { name: 'Galaxy S22 Ultra',         type: "mobile"},
};


const available_locations = {
	us:  { name: 'United States', full_name:'South Carolina, US',    region: "america"},
	us2: { name: 'United States', full_name:'Oregon, US',            region: "america"},
	us3: { name: 'United States', full_name:'Dallas, US',            region: "america"},
	us4: { name: 'United States', full_name:'Los Angeles, US',       region: "america"},
	us5: { name: 'United States', full_name:'Northern Virginia, US', region: "america"},
	us6: { name: 'United States', full_name:'Columbus, US',          region: "america"},
	us7: { name: 'United States', full_name:'Salt Lake City, US',    region: "america"},
	us8: { name: 'United States', full_name:'Las Vegas, US',         region: "america"},
	us9: { name: 'United States', full_name:'Iowa, US',              region: "america"},
	ca:  { name: 'Canada',        full_name:'Montreal, Canada',      region: "america"},
	ca2: { name: 'Canada',        full_name:'Toronto, Canada',       region: "america"},
	br:  { name: 'Brazil',        full_name:'São Paulo, Brazil',     region: "america"},
	cl:  { name: 'Chile',         full_name:'Santiago, Chile',       region: "america"},
	de:  { name: 'Germany',       full_name:'Frankfurt, Germany',    region: "europe"},
	uk:  { name: 'United Kingdom',full_name:'London, UK',            region: "europe"},
	nl:  { name: 'Netherlands',   full_name:'Netherlands',           region: "europe"},
	pl:  { name: 'Poland',        full_name:'Warsaw, Poland',        region: "europe"},
	ch:  { name: 'Switzerland',   full_name:'Zurich, Switzerland',   region: "europe"},
	es:  { name: 'Spain',         full_name:'Madrid, Spain',         region: "europe"},
	fi:  { name: 'Finland',       full_name:'Finland',               region: "europe"},
	it:  { name: 'Italy',         full_name:'Milan, Italy',          region: "europe"},
	fr:  { name: 'France',        full_name:'Paris, France',         region: "europe"},
	be:  { name: 'Belgium',       full_name:'Belgium',               region: "europe"},
	jp:  { name: 'Japan',         full_name:'Tokyo, Japan',          region: "asia"},
	jp2: { name: 'Japan',         full_name:'Osaka, Japan',          region: "asia"},
	in:  { name: 'India',         full_name:'Mumbai, India',         region: "asia"},
	in2: { name: 'India',         full_name:'Delhi, India',          region: "asia"},
	sg:  { name: 'Singapore',     full_name:'Singapore',             region: "asia"},
	au:  { name: 'Australia',     full_name:'Sydney, Australia',     region: "asia"},
	au2: { name: 'Australia',     full_name:'Melbourne, Australia',  region: "asia"},
	id:  { name: 'Indonesia',     full_name:'Jakarta, Indonesia',    region: "asia"},
	kr:  { name: 'South Korea',   full_name:'Seoul, South Korea',    region: "asia"},
	tw:  { name: 'Taiwan',        full_name:'Taiwan',                region: "asia"},
	il:  { name: 'Israel',        full_name:'Tel Aviv, Israel',      region: "asia"},
	hk:  { name: 'Hong Kong',     full_name:'Hong Kong',             region: "asia"},
};

let plan = null;
let loggedIn = false;
let installType = 'production'
let baseUrl;

function insertPaidFeatures(planName) {
	let locationList;
	let deviceList;
	if (planName === 'starter') {
		locationList = starter_locations;
		deviceList = starter_devices;
	} else if (planName === 'growth') {
		locationList = growth_locations;
		deviceList = growth_devices;
	} else if (planName === 'pro') {
		locationList = pro_locations;
		deviceList = pro_devices;
	} else {
		locationList = free_locations;
		deviceList = free_devices;
	}
	let locationCode = {asia: '', america: '', europe: ''}, deviceCode = {standard: '', mobile: '', tablet: '', desktop: ''};
	for (let i=0; i<locationList.length; i++) {
		locationCode[available_locations[locationList[i]].region] += ' <option value="' + locationList[i] + '">' + available_locations[locationList[i]].full_name + '</option>';
	}
	document.getElementById('america-optgroup').innerHTML = locationCode.america;
	document.getElementById('asia-optgroup').innerHTML = locationCode.asia;
	document.getElementById('europe-optgroup').innerHTML = locationCode.europe;

	for (let i=0; i<deviceList.length; i++) {
		deviceCode[available_devices[deviceList[i]].type] += ' <option value="' + deviceList[i] + '">' + available_devices[deviceList[i]].name + '</option>';
	}
	document.getElementById('standard-optgroup').innerHTML = deviceCode.standard;
	document.getElementById('mobile-optgroup').innerHTML = deviceCode.mobile;
	document.getElementById('tablet-optgroup').innerHTML = deviceCode.tablet;
	document.getElementById('desktop-optgroup').innerHTML = deviceCode.desktop;
}

document.addEventListener('DOMContentLoaded', async function () {
	const ext_info = await chrome.management.getSelf();

	baseUrl = ext_info.installType === "development" ? 'https://app.speedvitals-dev.com' : 'https://app.speedvitals.com';
	installType = ext_info.installType;
	const cookie = await chrome.cookies.get({ url: baseUrl, name: 'session'});
	if (cookie) {
		if (typeof cookie !== null && cookie.name === 'session' && cookie.value !== '') {
			let date = new Date();
			function j1(e,t){for(var n="",r=e.length,o=t.length;r-- >0&&o-- >0;)n=(parseInt(e.charAt(e.length-r),16)^parseInt(t.charAt(t.length-o),16)).toString(16)+n;return n} token=function k1(e,t){const n=j1(window.btoa(unescape(encodeURIComponent(e))),Math.floor(t.getTime()/1e3).toString()+"abcdefghijklmnopqrstuvwxyz");let r=window.btoa(unescape(encodeURIComponent(n)));return r="=="===r.substr(-2)?"c"+r.substr(0,r.length-2):"="===r.substr(-1)?"b"+r.substr(0,r.length-1):"a"+r,r}(baseUrl, date);
			try {
				const response = await fetch(`${baseUrl}/extension/user/`, {
				method: 'POST',
				headers: {
					'Cookie': `session=${cookie.value}`,
					'Content-Type': 'application/json',
					'expires': date
				},
				body: JSON.stringify({token})
				});
				const user = await response.json();
				plan = user.plan || null;
				loggedIn = user.loggedIn || false;
			} catch(err) {
				plan = 'free';
				loggedIn = 'false';
				baseUrl = '';
			}
		} else {
			plan = 'free';
			loggedIn = 'false';
			baseUrl = '';
		}
	} else {
		plan = 'free';
		loggedIn = 'false';
		baseUrl = '';
	}

	if (plan !== null && plan !== 'free') {
		insertPaidFeatures(plan);
	}

	document.getElementById('submitBtn').removeAttribute('disabled');
    document.getElementById('ttfbBtn').removeAttribute('disabled');

	const result = await chrome.storage.local.get(["preferredDevice", "preferredLocation"])
	if (typeof result === 'object' && Object.keys(result).length !== 0) {

		let deviceOptions = document.querySelectorAll('#query-device option');
		for (let i in deviceOptions) {
			if(deviceOptions[i].value === result.preferredDevice) {
				document.getElementById('query-device').value = result.preferredDevice;
				break;
			}
		}
		let locationOptions = document.querySelectorAll('#query-location option');
		for (let i in locationOptions) {
			if(locationOptions[i].value === result.preferredLocation) {
				document.getElementById('query-location').value = result.preferredLocation;
				break;
			}
		}
	}

	if (installType === "development") {
		if (loggedIn === true) {
			baseUrl = 'https://app.speedvitals-dev.com';
		} else {
			baseUrl = 'http://127.0.0.1:1337';
		}
	} else {
		if (loggedIn === true) {
			baseUrl = 'https://app.speedvitals.com';
		} else {
			baseUrl = 'https://speedvitals.com'
		}
	}

	const submitBtn = document.getElementById('submitBtn');
	submitBtn.addEventListener('click', async function () {
		chrome.tabs.query({'active': true, 'lastFocusedWindow': true, 'currentWindow': true}, async function (tabs) {
			let currentTabUrl = tabs[0].url;
			let testLocation = document.getElementById('query-location').value;
			let testDevice = document.getElementById('query-device').value;

			await chrome.storage.local.set({
				'preferredLocation': testLocation,
				'preferredDevice': testDevice,
			});

			if (currentTabUrl.includes('chrome://') || currentTabUrl.includes('edge://')) {
				document.getElementById('error-messages').innerText = "Please Switch to a Different Tab";
				document.getElementById('error-messages').style.display = 'block';
			} else {
				let test_url = baseUrl + "/?device=" + testDevice + "&autostart=1&extension=edge&location=" + testLocation + "&url=" + currentTabUrl;
				chrome.tabs.create({
					url: test_url
				});
			}
		});
	});

	const ttfbBtn = document.getElementById('ttfbBtn');
	ttfbBtn.addEventListener('click', async function () {

		if (installType === "development") {
			if (loggedIn === true) {
				baseUrl = 'https://app.speedvitals-dev.com';
			} else {
				baseUrl = 'http://127.0.0.1:1337';
			}
		} else {
			if (loggedIn === true) {
				baseUrl = 'https://app.speedvitals.com';
			} else {
				baseUrl = 'https://speedvitals.com'
			}
		}

		chrome.tabs.query({
			'active': true,
			'lastFocusedWindow': true,
			'currentWindow': true
		}, function (tabs) {
			let currentTabUrl = tabs[0].url;
			if (currentTabUrl.includes('chrome://') || currentTabUrl.includes('edge://')) {
				document.getElementById('error-messages').innerText = "Please Switch to a Different Tab";
				document.getElementById('error-messages').style.display = 'block';
			} else {
				let test_url = baseUrl + "/ttfb-test?autostart=1&extension=edge&url=" + currentTabUrl;
				chrome.tabs.create({ url: test_url });
			}
		});
	});
});