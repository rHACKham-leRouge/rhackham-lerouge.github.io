---
title: "Reflected XSS: How It Works, How to Find It, How to Exploit It"
description: "A deep dive into Reflected XSS. From the basics to real payloads, a commented lab, a real CVE, and how to defend against it. Part 2/4."
pubDatetime: 2026-04-07T00:00:00Z
tags: ["web", "xss", "series-xss", "beginner"]
featured: false
draft: false
---

## Table of Contents

## Introduction

In Part 1, we established the foundation: XSS is what happens when user input is trusted, injected into a page, and executed by a browser.

Now it is time to look at the first and most common type: **Reflected XSS**.

It is the simplest form of XSS to understand, the easiest to find in the wild, and a great entry point into exploitation. It is also frequently underestimated, which is exactly why attackers love it.

This part covers everything: how it works, how to find it, real payloads, a commented lab walkthrough, a real-world CVE, and how to defend against it.

---

## What is Reflected XSS?

**Reflected XSS** occurs when user input is immediately sent to the server and reflected back in the response, causing the browser to execute it as code.

The payload is not stored anywhere. It is sent to the server as part of the request and immediately reflected back in the response, without ever being saved.

```
┌─────────────┐  Malicious input  ┌─────────────┐  Reflected HTML  ┌─────────────┐
│   Attacker  │ ────────────────► │   Server    │ ───────────────► │   Browser   │
└─────────────┘                   └─────────────┘                  └─────────────┘
                                                                          │
                                                      executes injected script
```

Because the payload is not stored, the attack almost always requires **social engineering**: the attacker must trick the victim into clicking a crafted link. That is the one limitation of Reflected XSS. But as we will see, it is rarely a real obstacle.

---

## A Simple Example

Consider a search page. The user types a query, hits enter, and the page displays:

```
You searched for: john
```

The URL looks like this:

```
https://example.com/search?q=john
```

And the HTML returned by the server looks like this:

```html
<p>You searched for: john</p>
```

Now, what happens if the attacker crafts this query instead?

```
<script>alert("XSS")</script>
```

The URL will then look like this:

```
https://example.com/search?q=<script>alert("XSS")</script>
```

If the application reflects the **input without sanitizing** it, the browser executes the script, and an **alert popup appears**. 

**This confirms the XSS vulnerability**.

## How Attackers Deliver the Payload

Reflected XSS has **one constraint**: the victim has to be the one sending the malicious input to the server. The attacker cannot do it for them, because **the script executes in the victim's browser, not the attacker's**.

So how does the attacker get the victim to do it without them knowing?

First, the attacker finds a vulnerable input on a website. They test it by submitting a payload and observing whether it gets reflected in the response. Once confirmed, they craft a request containing the payload. **In a GET request, the payload is directly visible in the URL**, which makes it trivial to share. **In a POST request, the payload is not visible in the URL**, the attacker must instead host a malicious page that automatically submits a hidden form to the vulnerable site when the victim visits it.

Either way, the goal is the same. The attacker sends the link to the victim through **email, a direct message, a forum post, or even a QR code**. The link points to a real, legitimate website the victim recognizes and trusts. Nothing looks suspicious. They click it. Their browser sends the request to the server, the server reflects the payload back in the response, and **the script executes silently in the victim's browser**, without any visible sign that something went wrong.

This technique is called **social engineering**: manipulating someone into taking an action without realizing the consequences. 

**All it takes is one click.**

---

## Lab Walkthrough

> This walkthrough is based on **DVWA**[^1] (Damn Vulnerable Web Application), a free and legal practice environment. Never test on applications you do not own or have explicit permission to test.

### Setup

Install DVWA locally via Docker:

```bash
docker run --rm -it -p 80:80 vulnerables/web-dvwa
```

Visit `http://localhost`, log in (admin / password), set the security level to **Low**, and navigate to **XSS (Reflected)**.

### Step 1 — Understand the Target

The page contains a single input field asking for your name. Whatever you type appears in the response:

```
Hello john
```

The `name` parameter is reflected directly into the page. This is our injection point.

### Step 2 — Confirm the Vulnerability

Start with the classic proof of concept:

```html
<script>alert("XSS")</script>
```

Submit it. An alert box appears.

![XSS alert popup](/src/assets/images/xss_popup.png)

**Reflected XSS is confirmed.**

### Step 3 — Steal the Session Cookie

`alert()` confirms the vulnerability exists, but it does not demonstrate real impact. The most common and dangerous next step is **session cookie theft**.

#### What is a session cookie?

When you log into a website, the server creates a session and sends you a cookie to identify you. That cookie is your **proof of authentication**. Every request your browser makes includes it automatically, so the server knows who you are without asking for your password again.

If an attacker steals that cookie, they can **impersonate you completely**. They paste it into their own browser, and the server has no way to tell the difference. No password needed. No 2FA. Just the cookie.

#### Visualizing it on DVWA

DVWA does not allow us to fully practice cookie stealing in a realistic way, but we can already observe what an attacker would be after. Inject this payload:

```html
<script>alert(document.cookie)</script>
```
![XSS alert popup](/src/assets/images/xss_cookie.png)

The popup displays every cookie accessible to JavaScript on the page. In a real attack, an attacker who obtains a victim's cookie can simply open their browser's developer tools, navigate to **Application > Storage > Cookies**, replace their own cookie value with the stolen one, and refresh the page.

They are now logged in as the victim, **without ever entering a password**.

#### The HttpOnly protection

Not all cookies can be stolen this way. The `HttpOnly` flag is a cookie attribute that **prevents JavaScript from reading the cookie**:

```
Set-Cookie: PHPSESSID=abc123; HttpOnly
```

When this flag is set, `document.cookie` simply does not return that cookie. The XSS payload runs, but finds nothing to steal. This is one of the most effective mitigations against cookie theft via XSS, and why **it should always be set on session cookies**.

### Other Payload Types

Beyond these two, XSS payloads can be adapted to many other contexts: injecting into HTML attributes, into existing JavaScript blocks, or bypassing filters using encoding and tag variations. These techniques go beyond the scope of this article, but they follow the same core principle.

---

## Why Reflected XSS is Underestimated

A common objection is: *"The victim has to click a link. That requires social engineering."*

This underestimates both attackers and the attack surface.

**Phishing works.** A crafted link sent via email, Discord, or SMS to a user who trusts the domain (`bank.com`, `github.com`, `accounts.google.com`) is often clicked without hesitation. The domain is legitimate. The user has no reason to inspect the query string.

**Search engines index reflected parameters.** In rare cases, a malicious URL can be distributed passively by appearing in search results or being cached.

**Chained with other vulnerabilities, the impact scales.** Reflected XSS on an admin panel, combined with a CSRF[^4] token leak, can lead to full account takeover with a single click.

The "click required" limitation is a friction point, not a wall.

---

## Real-World Example: Fortnite (2019)

In 2019, security researchers discovered a Reflected XSS vulnerability on "Epic Games" login infrastructure, affecting one of the most popular games in the world at the time: **Fortnite**, with over 250 million registered accounts.

### What Was Vulnerable

The vulnerability was found on an **old, forgotten subdomain** of Epic Games that was still active and trusted by the main authentication system.
This is a common pattern in large organizations: subdomains get created, abandoned, and **never properly decommissioned**, so they remain part of the attack surface.

The login flow used **OAuth tokens to authenticate users across all Epic Games subdomains**. The vulnerable page reflected a parameter from the URL directly into the page without sanitizing it, allowing script injection.

### The Attack Chain

What made this vulnerability particularly dangerous was that it required **minimal interaction from the victim**. The attack chain looked like this:

The attacker sends a crafted link to the victim. The victim clicks it. 

The malicious script executes in the context of Epic Games domain, silently captures the authentication token, and sends it to the attacker.

**The attacker is now logged in as the victim**, with full access to their account, their stored payment methods, and their in-game purchases.

**No username. No password. No 2FA prompt. Just one click.**

### Why It Matters

This case illustrates several important points:

**Forgotten infrastructure is dangerous.** The vulnerability did not exist on Epic Games main website, but on an old subdomain nobody was paying attention to anymore.
Attackers look exactly for these kinds of entry points.

**Reflected XSS can bypass authentication entirely.** This was not just a cosmetic issue. A successful attack gave the attacker complete control over the victim's account, including access to saved credit card information.

**Scale amplifies everything.** A single vulnerability on a platform with 250 million users is not a minor issue. Even a fraction of the user base represents millions of potential victims.

The vulnerability was responsibly disclosed to Epic Games, who patched it shortly after.
**No large-scale exploitation was reported.**

---

## Defense

Reflected XSS is one of the most preventable vulnerabilities in web security. The mitigations are well-understood and widely supported.

### 1. Output Encoding

**The most important defense.** Encode all user-supplied data before inserting it into the HTML response. The encoding must match the context.

| Context | Encoding method |
|---------|----------------|
| HTML body | htmlspecialchars() / escapeHtml() |
| HTML attribute | Attribute encoding (quote all attributes) |
| JavaScript | JavaScript string encoding |
| URL | urlencode() |

```php
// Vulnerable
echo "You searched for: " . $_GET['q'];

// Safe
echo "You searched for: " . htmlspecialchars($_GET['q'], ENT_QUOTES, 'UTF-8');
```

### 2. Content Security Policy (CSP)[^5]

CSP is an HTTP response header that tells the browser which scripts it is allowed to execute. A strict CSP can prevent injected scripts from running, even when output encoding fails.

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

This blocks all inline scripts and external scripts not hosted on the same origin. It will not prevent the injection, but it will prevent execution.

> CSP is a safety net, not a substitute for output encoding.

### 3. HttpOnly and Secure Cookie Flags

```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

- `HttpOnly` prevents JavaScript from accessing the cookie, blocking the most common XSS impact (session hijacking via `document.cookie`).
- `Secure` ensures the cookie is only sent over HTTPS.
- `SameSite=Strict` limits cross-origin cookie transmission, reducing CSRF risk.

### 4. Input Validation

Reject input that does not match expected formats. A field that expects a username should not accept `<script>`. A field that expects a number should reject everything else.

Input validation alone is not sufficient as a defense against XSS, because legitimate input can still be dangerous in the wrong context. But it reduces the attack surface significantly.

### Defense Summary

| Measure | Prevents XSS? | Notes |
|---------|--------------|-------|
| Output encoding | ✅ Yes | Primary defense, always required |
| CSP | ⚠️ Partially | Stops execution, not injection |
| HttpOnly cookies | ⚠️ Partially | Blocks cookie theft only |
| Input validation | ⚠️ Partially | Reduces surface, not sufficient alone |
| WAF | ⚠️ Partially | Bypassable, not a substitute |

---

## Summary

**Reflected XSS is the most common form of XSS** and the easiest to understand. The attacker sends a malicious input to the server, the server reflects it back, and the browser executes it. **No persistence. No server access.** Just a crafted request and a vulnerable input.

Key takeaways:

- **Reflected XSS requires user interaction** (clicking a link), but social engineering makes this a manageable obstacle for attackers
- The injection **context determines which payload works**, not the other way around
- **Output encoding is the primary defense**, everything else is a complementary layer
- Even a "minor" Reflected XSS on a sensitive page can lead to full account takeover

In **Part 3**, we will look at **Stored XSS: the persistent variant**, where the payload does not disappear after a single request. It sits in the database, waiting for every future visitor. It is considered **the most dangerous type of XSS**, because the attacker does not need to trick anyone into clicking a link. The payload executes automatically, for every user who visits the compromised page.

---

## Glossary

[^1]: **DVWA** = **Damn Vulnerable Web Application** is an intentionally vulnerable PHP/MySQL web application designed for security professionals to practice their skills in a legal environment. Available at [dvwa.co.uk](https://dvwa.co.uk).

[^4]: **CSRF** = **Cross-Site Request Forgery** is a vulnerability that tricks a user into performing unintended actions on a web application where they are authenticated. Often chained with XSS for greater impact.

[^5]: **CSP** = **Content Security Policy** is an HTTP response header that allows a server to declare which dynamic resources are allowed to load. It is one of the most effective browser-side mitigations for XSS.