var fs = require('fs')
var cheerio = require('cheerio')
var request = require('request-promise-native')

const PREFIX = 'https://oyc.yale.edu'

async function main() {
    const courseHtml = await request(`${PREFIX}/religious-studies/rlst-152`);
    var $ = cheerio.load(courseHtml)
    var sel = '#quicktabs-tabpage-course-2 td.views-field-field-session-display-title';
    const courseTitle = $('#page-title').text().trim();
    const lectureHtmls = await Promise.all(
        $(sel).map(async (i, el) => {
            var $el = $(el)
            const lectureTitle = $el.text().trim();
            const lectureHref = $el.find('a').attr('href');
            const lectureUrl = `${PREFIX}/${lectureHref}`;
            const lectureHtml = await request(lectureUrl);
            return [i, lectureHtml, lectureTitle]
        }).get()
    )
    const lectures = lectureHtmls.reduce((lectures, [i, lectureHtml, lectureTitle]) => {
        const $$ = cheerio.load(lectureHtml);
        var ssel = '.node-session p';
        var desc = $$(ssel).text().trim()
        var fileUrl = $$('.views-field-field-audio--file a').attr('href')
        lectures[i] = {
            i,
            title: lectureTitle,
            mp3: fileUrl,
            desc,
        };
        return lectures;
    }, []);

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">
    <channel>
        <title>Yale - ${courseTitle}</title>
        ${lectures.map(({title, desc, mp3}) => `
            <item>
                <title>${title}</title>
                <itunes:title>${title}</itunes:title>
                <pubDate>Sun, 25 Nov 2018 16:34:24 +0000</pubDate>
                <guid isPermaLink="false"><![CDATA[a435dec6936741beb8c24e3d3ea248c6]]></guid>
                <link>http://feedproxy.google.com/~r/InternetHistoryPodcast/~3/nv2ug--3hx4/</link>
                <description>
                    <![CDATA[<p>${desc}</p>]]></description>
                <itunes:duration>01:19:37</itunes:duration>
                <itunes:explicit>clean</itunes:explicit>
                <itunes:keywords/>
                <itunes:subtitle>
                    <![CDATA[${desc}]]></itunes:subtitle>
                <itunes:summary>${desc}</itunes:summary>
                <itunes:episodeType>full</itunes:episodeType>
                <author>Yale</author>
                <itunes:author>Yale</itunes:author>
                <enclosure url="${mp3}" length="76563687" type="audio/mpeg"/>
            </item>
        `).join('')}
    </channel>
</rss>
    `;

    console.log(rss);
}

main();
