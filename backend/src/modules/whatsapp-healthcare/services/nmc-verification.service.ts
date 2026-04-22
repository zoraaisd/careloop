import fs from 'fs';
import https from 'https';

const NMC_BASE_URL = 'https://www.nmc.org.in/MCIRest';
const NMC_PAGE_URL = 'https://www.nmc.org.in/information-desk/indian-medical-register/';

function browserExecutableCandidates() {
  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean) as string[];
}

function findBrowserExecutable() {
  return browserExecutableCandidates().find(candidate => fs.existsSync(candidate)) || '';
}

function normalizeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bdr\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRegistration(value: string) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function splitWords(value: string) {
  return normalizeText(value).split(' ').filter(Boolean);
}

function namesMatch(inputName: string, registryName: string) {
  const inputTokens = splitWords(inputName);
  const registryTokens = splitWords(registryName);
  if (!inputTokens.length || !registryTokens.length) return false;

  const matchedTokenCount = inputTokens.filter(token => registryTokens.includes(token)).length;
  return matchedTokenCount === inputTokens.length;
}

function councilsMatch(inputCouncil: string, registryCouncil: string) {
  const inputTokens = splitWords(inputCouncil);
  const registryTokens = splitWords(registryCouncil);
  if (!inputTokens.length || !registryTokens.length) return false;

  const matchedTokenCount = inputTokens.filter(token => registryTokens.includes(token)).length;
  return matchedTokenCount >= Math.max(1, Math.ceil(inputTokens.length / 2));
}

async function fetchWithInsecureTls(url: string, options: any = {}, responseType = 'json') {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        if (response.statusCode! < 200 || response.statusCode! >= 300) {
          reject(new Error(`External service error ${response.statusCode}`));
          return;
        }

        try {
          resolve(responseType === 'json' ? JSON.parse(raw) : raw);
        } catch (parseError: any) {
          reject(new Error(`Unable to parse verification response: ${parseError.message}`));
        }
      });
    });

    request.on('error', error => {
      reject(error);
    });

    if (options.body) {
      const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      request.write(body);
    }

    request.end();
  });
}

async function searchNmcDoctor(registrationNumber: string) {
  const payload = {
    registrationNo: encodeURIComponent(String(registrationNumber || '').trim())
  };

  return fetchWithInsecureTls(`${NMC_BASE_URL}/open/getDataFromService?service=searchDoctor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'HealthBot Doctor Verification/1.0'
    },
    body: JSON.stringify(payload)
  });
}

async function searchNmcDoctorWithBrowser(registrationNumber: string) {
  const puppeteer = require('puppeteer-core');
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error('No local Chrome or Edge browser was found for Puppeteer verification.');
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(NMC_PAGE_URL, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#doct_regdNo');
    await page.type('#doct_regdNo', String(registrationNumber || '').trim());
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof regdNoWiseDocDetails !== 'function') {
        throw new Error('NMC registration search function is not available on the page.');
      }
      // @ts-ignore
      regdNoWiseDocDetails();
    });

    await page.waitForSelector('#doct_info3 tbody');
    await page.waitForFunction(() => {
      // @ts-ignore
      const doc = document as any;
      const processing = doc.querySelector('#doct_info3_processing');
      const rows = doc.querySelectorAll('#doct_info3 tbody tr');
      return (!processing || processing.textContent.trim() === '' || processing.style.display === 'none') && rows.length > 0;
    }, { timeout: 30000 });

    const rows = await page.evaluate(() => {
      // @ts-ignore
      const doc = document as any;
      const tableRows = Array.from(doc.querySelectorAll('#doct_info3 tbody tr'));
      return tableRows
        .map((row: any) => {
          const cells = Array.from(row.querySelectorAll('td')).map((cell: any) => cell.textContent?.trim() || '');
          const viewLink = row.querySelector('a[onclick*="openDoctorDetailsnew"]');
          const onclick = viewLink?.getAttribute('onclick') || '';
          const match = onclick.match(/openDoctorDetailsnew\('([^']+)','([^']*)'\)/);
          if (cells.length < 6) return null;
          return {
            serialNo: cells[0] || '',
            yearOfInfo: cells[1] || '',
            registrationNo: cells[2] || '',
            stateMedicalCouncil: cells[3] || '',
            name: cells[4] || '',
            fatherName: cells[5] || '',
            doctorId: match?.[1] || '',
            regdNoValue: match?.[2] || cells[2] || ''
          };
        })
        .filter(Boolean);
    });

    return rows;
  } finally {
    await browser.close();
  }
}

async function getNmcDoctorDetails(doctorId: string, registrationNumber: string) {
  const payload = {
    doctorId: String(doctorId || ''),
    regdNoValue: encodeURIComponent(String(registrationNumber || '').trim())
  };

  const text: any = await fetchWithInsecureTls(`${NMC_BASE_URL}/open/getDataFromService?service=getDoctorDetailsByIdImrExt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'HealthBot Doctor Verification/1.0'
    },
    body: JSON.stringify(payload)
  }, 'text');
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Unable to parse verification details');
  }
}

function buildRegistryMatch(result: any, detail: any) {
  return {
    doctorId: result?.doctorId || '',
    name: [detail?.firstName, detail?.middleName, detail?.lastName].filter(Boolean).join(' ').trim(),
    registrationNo: detail?.registrationNo || result?.registrationNo || '',
    stateMedicalCouncil: detail?.smcName || result?.smcName || '',
    yearOfInfo: detail?.yearInfo || result?.yearInfo || '',
    qualification: detail?.doctorDegree || '',
    qualificationYear: detail?.yearOfPassing || '',
    university: detail?.university || '',
    uprnNo: detail?.uprnNo || ''
  };
}

function validateRegistryMatch(input: any, registryMatch: any) {
  const inputRegistration = normalizeRegistration(input.medicalCouncilNumber);
  const registryRegistration = normalizeRegistration(registryMatch.registrationNo);
  if (!inputRegistration || !registryRegistration || inputRegistration !== registryRegistration) {
    return { verified: false, reason: 'Medical council number did not exactly match the official NMC record.' };
  }

  if (!namesMatch(input.name, registryMatch.name)) {
    return { verified: false, reason: 'Doctor name did not match the official NMC record.' };
  }

  if (!councilsMatch(input.medicalCouncilArea, registryMatch.stateMedicalCouncil)) {
    return { verified: false, reason: 'Medical council area did not match the official NMC record.' };
  }

  const inputYear = String(input.yearFinished || '').trim();
  const registryYear = String(registryMatch.qualificationYear || '').trim();
  if (inputYear && registryYear && inputYear !== registryYear) {
    return { verified: false, reason: 'Year finished did not match the official NMC record.' };
  }

  return { verified: true };
}

export class NmcVerificationService {
  async verifyDoctorWithNmc(input: any) {
    let results: any[] = [];
    let browserMode = false;

    try {
      results = await searchNmcDoctorWithBrowser(input.medicalCouncilNumber);
      browserMode = true;
    } catch {
      const response: any = await searchNmcDoctor(input.medicalCouncilNumber);
      results = Array.isArray(response) ? response : [];
    }

    if (!Array.isArray(results) || !results.length) {
      return {
        verified: false,
        reason: 'No matching doctor was found in the NMC Indian Medical Register.',
        verificationUrl: NMC_PAGE_URL
      };
    }

    const exactRegistrationResults = results.filter(result => {
      return normalizeRegistration(result?.registrationNo) === normalizeRegistration(input.medicalCouncilNumber);
    });

    if (!exactRegistrationResults.length) {
      return {
        verified: false,
        reason: 'No exact medical council number match was found in the official NMC registry.',
        verificationUrl: NMC_PAGE_URL,
        candidatesFound: results.length,
        verificationMode: browserMode ? 'browser' : 'service'
      };
    }

    for (const result of exactRegistrationResults.slice(0, 10)) {
      let registryMatch = {
        doctorId: result?.doctorId || '',
        name: result?.name || '',
        registrationNo: result?.registrationNo || '',
        stateMedicalCouncil: result?.stateMedicalCouncil || result?.smcName || '',
        yearOfInfo: result?.yearOfInfo || '',
        qualification: '',
        qualificationYear: '',
        university: '',
        uprnNo: ''
      };

      if (result?.doctorId) {
        const detail = await getNmcDoctorDetails(result.doctorId, result.regdNoValue || input.medicalCouncilNumber);
        registryMatch = buildRegistryMatch(result, detail);
      }

      const validation = validateRegistryMatch(input, registryMatch);
      if (validation.verified) {
        return {
          verified: true,
          verificationUrl: NMC_PAGE_URL,
          verificationMode: browserMode ? 'browser' : 'service',
          registryMatch
        };
      }
    }

    return {
      verified: false,
      reason: 'The entered doctor details did not exactly match the official NMC registry record.',
      verificationUrl: NMC_PAGE_URL,
      candidatesFound: exactRegistrationResults.length,
      verificationMode: browserMode ? 'browser' : 'service'
    };
  }
}
