/*
 * Copyright (c) 2018, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

/* global process, window, document */

import OktaAuth from '@okta/okta-auth-js';

/* eslint-disable prefer-destructuring */
const DOMAIN = process.env.DOMAIN;
const CLIENT_ID = process.env.CLIENT_ID;
/* eslint-enable prefer-destructuring */

const ISSUER = `https://${DOMAIN}/oauth2/default`;
const HOST = window.location.host;
const REDIRECT_URI = `http://${HOST}/implicit/callback`;

const oktaAuth = new OktaAuth({
  // maxClockSkew: Number.MAX_SAFE_INTEGER, // FORCES TOKEN RENEW
  issuer: ISSUER,
  clientId: CLIENT_ID,
  redirectUri: REDIRECT_URI,
});

const code = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const codeVerifier = oktaAuth.pkce.generateVerifier(code);

window.login = async function login(event) {
  event.preventDefault(); // Necessary to prevent default navigation for redirect below

  const scopes = ['openid', 'email', 'profile'];
  const codeChallenge = await oktaAuth.pkce.computeChallenge(codeVerifier);
  oktaAuth.pkce.getWithRedirect({
    scopes,
    codeChallenge,
  });
};

window.logout = async function logout() {
  oktaAuth.tokenManager.clear();
  await oktaAuth.signOut();
  window.location.reload();
};

async function handleAuthentication() {
  let authorizationCode = await oktaAuth.pkce.parseFromUrl();
  let tokens = await oktaAuth.pkce.exchangeForToken({
    code: authorizationCode,
    codeVerifier: codeVerifier,
  });
  console.log('tokens', tokens);
  tokens = Array.isArray(tokens) ? tokens : [tokens];
  tokens.forEach((token) => {
    if (token.idToken) {
      oktaAuth.tokenManager.add('idToken', token);
    } else if (token.accessToken) {
      oktaAuth.tokenManager.add('accessToken', token);
    }
  });
}

async function getUser() {
  const accessToken = await oktaAuth.tokenManager.get('accessToken');
  const idToken = await oktaAuth.tokenManager.get('idToken');
  if (accessToken && idToken) {
    const userinfo = await oktaAuth.token.getUserInfo(accessToken);
    if (userinfo.sub === idToken.claims.sub) {
      // Only return the userinfo response if subjects match to
      // mitigate token substitution attacks
      return userinfo;
    }
  }
  return idToken ? idToken.claims : undefined;
}


function renderApp(props) {
  const { user } = props;
  const content = (user ?
    `<h2>${user.name}</h2><a href="/" onclick="logout()">Logout</a>` :
    '<a href="/" onclick="login(event)">Login</a>'
  );
  const rootEl = document.getElementById('root');
  rootEl.innerHTML = `<div>${content}</div>`;
}

function renderCallback() {
  const rootEl = document.getElementById('root');
  const content = '<a href="/">Return Home</a>';
  rootEl.innerHTML = `<div>${content}</div>`;
}

async function start() {
  const { pathname } = window.location;
  if (pathname.startsWith('/implicit/callback')) {
    handleAuthentication();
    return renderCallback();
  }
  let user;
  try {
    user = await getUser();
  } catch (e) {
    console.error(e);
  }

  return renderApp({
    user,
  });
}

start();
