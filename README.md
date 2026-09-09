# দৈনিক করবার্তা — সেটআপ নির্দেশিকা

## ১. Netlify-তে ডিপ্লয় করা
এই পুরো ফোল্ডারটি একটা GitHub রিপোতে পুশ করুন, তারপর Netlify-তে "Import from Git" দিয়ে কানেক্ট করুন।
অথবা: Netlify dashboard → **Sites** → **Add new site** → **Deploy manually** → পুরো ফোল্ডার/zip টেনে ছেড়ে দিন।

Build settings:
- **Build command**: খালি রাখুন
- **Publish directory**: `.`

(এই সাইটে কোনো build ধাপ নেই, তাই আগের "build command not set" সমস্যাটা হবে না — শুধু publish directory `.` সেট করলেই চলবে।)

## ২. এডমিন প্যানেল চালু করা (Netlify Identity + Git Gateway)
এডমিন প্যানেল (`/admin/`) থেকে কনটেন্ট আপডেট করতে হলে GitHub-এর মাধ্যমে ডিপ্লয় করা থাকতে হবে, আর দুটো ফিচার চালু করতে হবে:

1. Netlify dashboard-এ আপনার সাইটে যান → **Site configuration** → **Identity** → **Enable Identity**
2. Identity সেকশনে **Registration** → **Invite only** নির্বাচন করুন (যাতে যে কেউ সাইন আপ করতে না পারে)
3. **Site configuration** → **Identity** → **Services** → **Git Gateway** → **Enable Git Gateway**
4. **Identity** ট্যাব থেকে নিজেকে **Invite user** করুন (নিজের ইমেইল দিয়ে)
5. ইমেইলে যে লিংক আসবে সেখানে ক্লিক করে পাসওয়ার্ড সেট করুন
6. এরপর `আপনারডোমেইন.netlify.app/admin/` এ গিয়ে লগইন করলেই এডমিন প্যানেল থেকে সংবাদ যোগ, এডিট বা মুছে ফেলা যাবে

## ৩. কীভাবে কাজ করে
- `content/articles.json` — সব সংবাদ এখানে জমা থাকে
- `content/settings.json` — পত্রিকার নাম, ট্যাগলাইন ও ব্রেকিং নিউজ এখানে
- এডমিন প্যানেল থেকে কিছু পরিবর্তন করলে তা সরাসরি GitHub রিপোতে কমিট হয়ে যায়, আর Netlify স্বয়ংক্রিয়ভাবে সাইট রিডিপ্লয় করে (কয়েক সেকেন্ড সময় লাগতে পারে)

## ৪. নিজের কম্পিউটারে টেস্ট করা
```
cd দৈনিক-করবার্তা-ফোল্ডার
python3 -m http.server 8000
```
তারপর ব্রাউজারে `http://localhost:8000` খুলুন। (এডমিন প্যানেল লোকাল সার্ভারে কাজ করবে না, শুধু Netlify-তে ডিপ্লয় করার পর করবে।)

## ৫. SEO — প্রতিটা সংবাদের আলাদা URL
এই সাইটে একটা `build.js` স্ক্রিপ্ট আছে যেটা `content/articles.json` থেকে প্রতিটা সংবাদের জন্য আলাদা static পেজ (`/article/শিরোনাম-slug/`), `sitemap.xml` ও `robots.txt` তৈরি করে — প্রতিটা পেজের নিজস্ব title ও meta description থাকে, যা Google search-এর জন্য জরুরি।

**GitHub দিয়ে ডিপ্লয় করলে:** এডমিন প্যানেল থেকে কিছু সেভ করলেই Netlify স্বয়ংক্রিয়ভাবে `node build.js` চালিয়ে সব পেজ নতুন করে বানিয়ে দেবে (এটা `netlify.toml`-এ বিল্ড কমান্ড হিসেবে সেট করা আছে)।

**zip দিয়ে ম্যানুয়ালি ডিপ্লয় করলে:** কনটেন্ট পরিবর্তনের পর নিজের কম্পিউটারে নিচের কমান্ড চালিয়ে তারপর নতুন zip বানিয়ে আপলোড করতে হবে:
```
node build.js
```
(এর জন্য কম্পিউটারে Node.js ইনস্টল থাকা লাগবে — নেই থাকলে nodejs.org থেকে ইনস্টল করে নিন)

নিজের ডোমেইন যোগ করলে `build.js` ফাইলের ভেতরে `SITE_URL` ভ্যারিয়েবলটা নতুন ডোমেইন দিয়ে বদলে দিতে ভুলবেন না, নাহলে sitemap ও meta ট্যাগে পুরনো `.netlify.app` ঠিকানা থেকে যাবে।

## ৬. Google Search Console-এ sitemap জমা দেওয়া
1. [search.google.com/search-console](https://search.google.com/search-console) এ যান
2. আপনার প্রপার্টি সিলেক্ট করুন → বাম পাশে **Sitemaps**
3. লিখুন: `sitemap.xml` → **Submit**

