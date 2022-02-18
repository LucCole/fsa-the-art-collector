const BASE_URL = 'https://api.harvardartmuseums.org';
const KEY = 'apikey=400f15f7-e5e8-4495-ae39-6c4426eeb810'; 


// Fetch

async function fetchAllCenturies() {

    const url = `${ BASE_URL }/century?${ KEY }&size=100&sort=temporalorder`;
  
    if (localStorage.getItem('centuries')) {
        return JSON.parse(localStorage.getItem('centuries'));
    }

    onFetchStart();

    try {

        const response = await fetch(url);
        const data = await response.json();
        const records = data.records;

        await localStorage.setItem('centuries', JSON.stringify(records))
  
        return records;
    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
}

async function fetchAllClassifications() {

    const url = `${ BASE_URL }/classification?${ KEY }&size=100&sort=name`;
  
    if (localStorage.getItem('classifications')) {
        return JSON.parse(localStorage.getItem('classifications'));
    }

    onFetchStart();

    try {

        const response = await fetch(url);
        const data = await response.json();
        const records = data.records;

        await localStorage.setItem('classifications', JSON.stringify(records))
  
        return records;
    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
}


// Other / Helper

async function prefetchCategoryLists() {
    try {
        const [
            classifications, centuries
        ] = await Promise.all([
            fetchAllClassifications(),
            fetchAllCenturies()
        ]);

        $('.classification-count').text(`(${ classifications.length })`);

        classifications.forEach(classification => {
            $('#select-classification').append($(`
            <option value="${classification.name}">${classification.name}</option>
            `))
        });

        $('.century-count').text(`(${ centuries.length }))`);

        centuries.forEach(century => {
            $('#select-century').append($(`
            <option value="${century.name}">${century.name}</option>
            `))
        });
    } catch (error) {
        console.error(error);
    }
}

async function buildSearchString(){
    const classification = $('#select-classification').val(),
    century = $('#select-century').val(),
    keywords = $('#keywords').val()

    return encodeURI(`https://api.harvardartmuseums.org/object?${KEY}&classification=${classification}&century=${century}&keyword=${keywords}`);
}

function onFetchStart() {
    $('#loading').addClass('active');
}
  
function onFetchEnd() {
    $('#loading').removeClass('active');
}

function searchURL(searchType, searchString) {
    return `${ BASE_URL }/object?${ KEY }&${ searchType}=${ searchString }`;
}


// HTML Templates / Render

function renderFeature(record) {
    
    const {
        title, 
        dated,
        description,
        culture,
        style,
        technique,
        medium,
        dimensions,
        people,
        department,
        division,
        contact,
        creditline,
        images,
        primaryimageurl
    } = record;

    return $(`
        <div class="object-feature">
            <header>
                <h3>${title}</h3>
                <h4>${dated}</h4>
            </header>
            <section class="facts">
                ${factHTML('Description', description)}
                ${factHTML('Culture', culture, 'culture')}
                ${factHTML('Style', style)}
                ${factHTML('Technique', technique, 'technique')}
                ${factHTML('Medium', medium ? medium.toLowerCase() : null, 'medium')}
                ${factHTML('Dimensions', dimensions)}

                ${
                    people
                    ? people.map((person) => {
                        return factHTML('Person', person.displayname, 'person');
                    }).join('')
                    : ''
                }

                ${factHTML('Department', department)}
                ${factHTML('Division', division)}
                ${factHTML('Contact', `<a target="_blank" href="mailto:${contact}">${contact}</a>`)}
                ${factHTML('Credit', creditline)}
            </section>
            <section class="photos">
                ${ photosHTML(images, primaryimageurl) }
            </section>
        </div>
    `);
}

function photosHTML(images, primaryimageurl) {
    
    if(images && images.length > 0){

        return images.map((image) => {
            return `<img src="${image.baseimageurl}"/>`;
        }).join('')

    }else if(primaryimageurl){
        return `<img src="${primaryimageurl} />`;
    }else{
        return '';
    }
}
  
function factHTML(title, content, searchTerm = null) {

    if(!content){
        return '';
    }else{
        return (`
        <span class="title">${title}</span>
        <span class="content">${
            searchTerm 
            ? `<a href="${searchURL(searchTerm, content)}">${content}</a>`
            : content
        }</span>
        `);
    }
}

function renderPreview(record) {
  
    // This was the description, but I took this out as it looked weird and didnt match the example. 
    // ${record.description ? `<h3>${record.description}</h3>` : ''}
    const recordElem = $(`
    <div class="object-preview">
        <a href="#">
        ${record.primaryimageurl ? `<img src="${record.primaryimageurl}" />` : ''}
        ${record.title ? `<h3>${record.title}</h3>` : ''}
        </a>
    </div>
    `);

    recordElem.data('record', record);
  
    return recordElem;
}

function updatePreview(records) {

    const root = $('#preview'),
    nextBtn = $('.next'),
    prevBtn = $('.previous');

    if(records.info.next){
        nextBtn.attr('disabled', false);
        nextBtn.data('url', records.info.next);
    }else{
        nextBtn.attr('disabled', true);
        nextBtn.data('url', null);
    }

    if(records.info.prev){
        prevBtn.attr('disabled', false);
        prevBtn.data('url', records.info.prev);
    }else{
        prevBtn.attr('disabled', true);
        prevBtn.data('url', null);
    }

    resultsElem = root.find('.results')
    resultsElem.empty();

    records.records.forEach((record) => {
        resultsElem.append(renderPreview(record));
    })
}


// On Action

$('#preview .next, #preview .previous').on('click', async function () {

    onFetchStart();

    try {
        const url = $(this).data('url')

        const response = await fetch(url),
        data = await response.json();

        updatePreview(data);

    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
});

$('#feature').on('click', 'a', async function (event) {

    if ($(this).attr('href').startsWith('mailto')) { return; }

    event.preventDefault();

    const url = $(this).attr('href')

    onFetchStart();

    try {
    
        const response = await fetch(url),
        data = await response.json();

        updatePreview(data);

    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
});

$('#preview').on('click', '.object-preview', function (event) {
    event.preventDefault();

    const objectPreviewElem = $(this).closest('.object-preview'),
    record = objectPreviewElem.data('record')

    $('#feature').html(renderFeature(record))
});

$('#search').on('submit', async function (event) {

    event.preventDefault();
  
    onFetchStart();

    try {
        const url = await buildSearchString();

        const response = await fetch(url);
        const data = await response.json();

        updatePreview(data)

    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
});


// Setup

prefetchCategoryLists()