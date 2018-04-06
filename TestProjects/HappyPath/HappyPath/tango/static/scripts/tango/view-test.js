$(function () {
    $('#tango-frame-header').html("Testing: " + tangoPage['view_name']);
    $('#tango-frame').attr('src', baseUrl + tangoPage['view_name'])
    $('#pass-button').hide();
    $('#fail-button').hide();
    updateNoCases();
    updateCasesTable();
    updateCurrentCase();
    if (tangoPage['cases'].length) updateCasesExist()
});

$("#test-case-button").click(function () {
    $('#test-case-button').hide();
    $('#pass-button').show();
    $('#fail-button').show();
    runTestCase();
    updateCurrentCase();
});

$("#pass-button").click(function () {
    $('#pass-button').hide();
    $('#fail-button').hide();
    $('#test-case-button').show();
    tangoPage['cases'][0]['status'] = 'Pass';
    updateCases();
});

$("#fail-button").click(function () {
    $('#pass-button').hide();
    $('#fail-button').hide();
    $('#test-case-button').show();
    $("#case-fail-notes").val("");
});

$("#update-fail-button").click(function () {
    tangoPage['cases'][0]['status'] = 'Fail';
    updateCases();
    updateFailedCase();
    updateCasesTable();
    saveTangoPage();
    failedCaseNotification();
});

$("#add-case-button").click(function () {
    submitCustomCase();
    updateCasesTable();
    updateCurrentCase();
    updateCasesExist();
});

$("#update-notes-button").click(function () {
    updateCurrentNote();
});

$("#results-table").on("click", "tr", function () {
    selectedPermutationIndex = $(this).index() - 1;
    updateSelectedPermutation(selectedPermutationIndex);
});

$("#generate-manual-case-button").click(function () {
    let newCaseId = createCustomCase();
    createCustomCaseTable(newCaseId);
});

$("#edit-selectors-button").click(function () {
    UIkit.modal('#edit-selectors-modal').show();
    updateSelectorsTable();
});

$("#toggle-all-saves-button").click(function () {
    debugger;
    toggleCasesSave();
    saveTangoPage();
    updateCasesTable();
});

UIkit.util.on('#generate-cases-button', 'click', function (e) {
    e.preventDefault();
    e.target.blur();
    if (tangoPage['cases'].length > 0) {
        UIkit.modal.confirm('Unsaved cases will be overwritten!').then(function () {
            generatePermutationsAjax();
        }, function () {
        });
    }
    else {
        generatePermutationsAjax();
    }
});

function generatePermutationsAjax() {
    let requestUrl = window.location.origin + "/tango/generate-permutations";
    $.get(requestUrl, { viewName: tangoPage['view_name'] },
        function (data) {
            createCases(data);
            updateCasesTable();
            updateCurrentCase();
            updateCasesExist();
        });
}

function passedCaseNotification() {
    UIkit.notification({
        message: 'Test Passed!',
        status: 'success',
        pos: 'bottom-right',
        timeout: 1000
    });
}

function failedCaseNotification() {
    UIkit.notification({
        message: 'Test Failed!',
        status: 'danger',
        pos: 'bottom-right',
        timeout: 1000
    });
}

async function runTestCase() {
    resetIFrameFields();
    for (i in tangoPage['cases'][0]['test_data']) {
        await setIFrameField();
        await sleep(125);
    }

    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1;

    let yyyy = today.getFullYear();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    
    today = dd + '/' + mm + '/' + yyyy;
    tangoPage['cases'][0]['last_ran'] = today

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function setIFrameField() {
        $("#tango-frame").contents().find(getSelector(tangoPage['cases'][0]['test_data'][i]['field_name']))
            .val(tangoPage['cases'][0]['test_data'][i]['test_value']);
    }

    function resetIFrameFields() {
        for (i in tangoPage['cases'][0]['test_data']) {
            $("#tango-frame").contents().find(getSelector(tangoPage['cases'][0]['test_data'][i]['field_name'])).val('');
        }
    }
}

function getSelector(fieldName) {
    for (i in tangoPage['fields']) {
        if (tangoPage['fields'][i]['name'] === fieldName) return tangoPage['fields'][i]['selector']
    }
}

function updateCases() {
    tangoPage['cases'].push(tangoPage['cases'].splice(0, 1)[0]); 
    updateCasesTable();
    saveTangoPage();
}

function saveTangoPage() {
    let saveTangoPage = Object.assign({}, tangoPage); 
    saveTangoPage['cases'] = saveTangoPage['cases'].filter(function (item) { return item['save'] === "true"; });
    let requestUrl = window.location.origin + "/tango/save-tango-page";
    $.get(requestUrl, { 'tangoPage': JSON.stringify(saveTangoPage) }) // TODO: Make this work as a POST
}

function toggleCasesSave() {
    for (i in tangoPage['cases']) {
        if (!tangoPage['cases'][i]['save']) {
            saveAllCases()
            return;
        }
    }
    unsaveAllCases();

}

function saveAllCases() {
    for (i in tangoPage['cases']) {
        tangoPage['cases'][i]['save'] = 'True';
    }
    saveTangoPage();
}

function unsaveAllCases() {
    for (i in tangoPage['cases']) {
        tangoPage['cases'][i]['save'] = 'False';
    }
    saveTangoPage();
}

function updateSelectors() {
    for (i in tangoPage['fields']) {
        tangoPage['fields'][i]['selector'] = $("#custom-selector" + i).val();
    }

    saveTangoPage();
}

function createCustomCase() {
    newTestCase['id'] = createNewId();
    newTestCase['last_ran'] = "-";
    newTestCase['importance'] = "1";
    newTestCase['notes'] = "";
    newTestCase['status'] = "Not Ran";
    newTestCase['save'] = false;
    return newTestCase["id"];
}

function createCases(permutations) {
    tangoPage['cases'] = tangoPage['cases'].filter(function (item) { return item['save'] === "true"; });

    while (isMoreTestValues(permutations)) {
        for (i in permutations) {
            let testCase = {}
            testCase['id'] = createNewId();
            testCase['last_ran'] = "-";
            testCase['importance'] = "1";
            testCase['notes'] = "";
            testCase['status'] = "Not Ran";
            testCase['save'] = 'false';
            testCase['test_data'] = getTestData(permutations);
            tangoPage['cases'].push(testCase);
        }
    }

    function getTestData(permutations) {
        let test_data = []

        for (i in permutations) {
            let test_input = {}
            if (permutations[i]['test_values'].length > 0) {
                test_input['test_value'] = permutations[i]['test_values'][0];
            }
            else {
                test_input['test_value'] = ''
            }
            test_input['field_name'] = permutations[i]['field_name'];

            test_data.push(test_input);
            permutations[i]['test_values'].shift();
        }

        return test_data;
    }

    function isMoreTestValues(permutations) {
        for (i in permutations) {
            if (permutations[i]['test_values'].length > 0) {
                return true;
            }
        }
        return false;
    }
}

function updateFailedCase() {
    tangoPage['cases'][tangoPage['cases'].length - 1]['importance']
        = $("input[name=importance-rating]:checked").val();
    tangoPage['cases'][tangoPage['cases'].length - 1]['notes'] = $("#case-fail-notes").val();
}

function updateSelectedCase(data) {
    tangoPage['cases'][data]['importance'] = $("input[name=importance-rating]:checked").val();

    tangoPage['cases'][data]['status'] = $("input[name=status-selection]:checked").val();

    for (i in tangoPage['cases'][data]['test_data']) {
        tangoPage['cases'][data]['test_data'][i]['test_value']
            = $("#custom-case-update-" + tangoPage['cases'][data]['test_data'][i]['field_name']).val();
    }
    updateCasesTable();
    saveTangoPage();
    updateCurrentCase();
}

function updateCurrentNote(data) {

    tangoPage['cases'][data]['notes'] = $('#notes-textarea').val();
}

function updateCaseSaveStatus(data) {
    let caseIndex = data.parent().parent().index() - 1;

    if (data[0].checked) tangoPage['cases'][caseIndex]['save'] = "true";
    else tangoPage['cases'][caseIndex]['save'] = "false";

    saveTangoPage();
}

function submitCustomCase() {
    let newTestData = [];

    for (i in fieldNames) {
        let newFieldValue = {};
        newFieldValue['field_name'] = fieldNames[i];
        newFieldValue['test_value'] = $('#custom-case-new-' + newFieldValue['field_name']).val();
 
        newTestData.push(newFieldValue);
    }
    newTestCase['test_data'] = newTestData;
    cases.unshift(newTestCase);
    newTestCase = {};
}

function deleteCase() {
    tangoPage['cases'].splice(selectedPermutationIndex, 1);
    updateCasesTable();
    saveTangoPage();
    updateCurrentCase();
    updateCasesExist();
    if (cases.length) updateNoCases();
}

function updateNoCases() {
    $("#test-case-button").prop('disabled', true);
}

function updateCasesExist() {
    $("#test-case-button").prop('disabled', false);
}

function createNewId() {
    return Math.random().toString(36).substr(2, 8);
}

function openNotesModal(data) {
    var caseIndex = data.parent().parent().index() - 1;
    let html = '<h3 class="uk-heading-divider">Notes for Case - ' + tangoPage['cases'][caseIndex]['id'] + '</h1>';
    $('#notes-text').html(html);

    html = ' <button onclick= "updateCurrentNote(' + caseIndex + ')" style= "float: left"class="uk-button uk-button-default uk-modal-close uk-button-primary" type= "button" id= "update-notes-button" > Update</button >';
    html += ' <button class="uk-button uk-button-default uk-modal-close" type="button">Close</button>';
    $('#notes-footer').html(html);

    $('#notes-textarea').val(tangoPage['cases'][caseIndex]['notes']);

    UIkit.modal('#case-notes-modal').show();
}

function updateCasesTable() {
    if (tangoPage['cases'].length === 0) {
        $('#results-table').html("");
        $('#toggle-all-saves').html("");
        return;
    }

    var html = '<h3 class="uk-heading-divider">All Cases</h1>';
    html += '<table class="uk-table uk-table-striped all-cases-table">';

    html += '<tr>';
    html += '<th>ID</th>';
    html += '<th>Last Ran</th>';
    html += '<th>Importance</th>';
    html += '<th>Notes</th>';
    html += '<th>Save</th>';
    html += '</tr>';

    for (let i = 0; i < tangoPage['cases'].length; i++) {
        if (tangoPage['cases'][i]['status'] === "Pass") {
            html += '<tr style="background-color: #CCFFCC; cursor: pointer" href="#case-details-modal" uk-toggle>';
        }
        else if (tangoPage['cases'][i]['status'] === "Fail") {
            html += '<tr style="background-color: #FFAD99; cursor: pointer" href="#case-details-modal" uk-toggle>';
        }
        else {
            html += '<tr href="#case-details-modal" style="cursor: pointer" uk-toggle>';
        }
        html += '<td>' + tangoPage['cases'][i]['id'] + '</td>';
        html += '<td>' + tangoPage['cases'][i]['last_ran'] + '</td>';
        html += '<td>' + tangoPage['cases'][i]['importance'] + '</td>';
        html += '<td> <a uk-icon="warning" onclick= "openNotesModal($(this)); event.stopPropagation()" /> </td > ';

        if (tangoPage['cases'][i]['save'] === "true") html += '<td> <input checked '
        else html += '<td> <input '

        html += 'class="uk-checkbox" type= "checkbox" onclick= "updateCaseSaveStatus($(this)); event.stopPropagation()" /> </td > ';
        html += '</tr>';
    }

    html += '</table>';
    $('#results-table').html(html);

    html = '<button type="button" id="toggle-all-saves-button" class="uk-button uk-button-primary uk-button-small uk-float-right" uk-toggle>Toggle Save</button>'
    $('#toggle-all-saves').html(html);
}

function updateCurrentCase() {
    if (tangoPage['cases'].length === 0) {
        $('#current-case').html("");
        return;
    }

    var html = '<h3 class="uk-heading-divider">Current Case - ' + tangoPage['cases'][0]['id'] + '</h1>';
    html += '<table class="uk-table uk-table-striped">';

    html += '<tr>';
    html += '<th>Field Name</th>';
    html += '<th>Test Value</th>';
    html += '</tr>';
    for (i in tangoPage['cases'][selectedPermutationIndex]['test_data']) {
        html += '<tr>';
        html += '<td>' + tangoPage['cases'][selectedPermutationIndex]['test_data'][i]['field_name'] + '</td>';
        html += '<td class="uk-panel uk-panel-box uk-text-truncate">'
            + tangoPage['cases'][selectedPermutationIndex]['test_data'][i]['test_value'] + '</td>';
        html += '</tr>';
    }
    html += '</table>';
    $('#current-case').html(html);
}

function updateSelectedPermutation(selectedPermutationIndex) {
    var html = '<h3 class="uk-heading-divider">Selected Case - '
        + tangoPage['cases'][selectedPermutationIndex]['id'] + '</h1>';
    html += '<table class="uk-table uk-table-striped">';

    html += '<tr>';
    html += '<th>Field Name</th>';
    html += '<th>Test Value</th>';
    html += '</tr>';

    for (i in tangoPage['cases'][selectedPermutationIndex]['test_data']) {
        html += '<tr>';
        html += '<td>' + tangoPage['cases'][selectedPermutationIndex]['test_data'][i]['field_name'] + '</td>';
        html += '<td> <input id="custom-case-update-'
            + tangoPage['cases'][selectedPermutationIndex]['test_data'][i]['field_name']
            + '" class="uk-input" type="text" value="'
            + tangoPage['cases'][selectedPermutationIndex]['test_data'][i]['test_value'] + '"></td>';
        html += '</tr>';
    }
    html += '</table>';
    $('#selected-case-details').html(html);

    html = '<button onclick="deleteCase()" style="float: left" class="uk-button uk-button-default uk-modal-close uk-button-danger" type="button">Delete Case</button>'
    html += ' <button style="margin-right:10px" onclick= "updateSelectedCase(' + selectedPermutationIndex + ')" class="uk-button uk-button-default uk-modal-close uk-button-primary" type= "button" id= "update-case-button" > Apply</button >'
    html += '<button class="uk-button uk-button-default uk-modal-close" type= "button" > Close </button>'
    $('#selected-case-footer').html(html);

    $('#importance-rating' + tangoPage['cases'][selectedPermutationIndex]['importance']).prop('checked', true);

    let status = tangoPage['cases'][selectedPermutationIndex]['status'];
    if (status === 'Pass') $('#pass-status').prop('checked', true);
    else if (status === 'Fail') $('#fail-status').prop('checked', true);
    else $('#not-ran-status').prop('checked', true);
}

function updateSelectorsTable() {
    var html = '<h3 class="uk-heading-divider">Selectors</h1>';
    html += '<table class="uk-table uk-table-striped">';
    html += '<tr>';
    html += '<th>Field Name</th>';
    html += '<th>Selector</th>';
    html += '</tr>';

    for (i in tangoPage['fields']) {
        html += '<tr>';
        html += '<td>' + tangoPage['fields'][i]['name'] + '</td>';
        html += '<td> <input id="custom-selector' + i + '" class="uk-input" type="text" value="' + tangoPage['fields'][i]['selector'] + '"></td>';
        html += '</tr>';
    }
    html += '</table>';
    $('#selectors-table').html(html)
}

function createCustomCaseTable(caseId) {
    let html = '<h3 class="uk-heading-divider">New Case - ' + caseId + '</h1>';
    html += '<table class="uk-table uk-table-striped">';

    html += '<tr>';
    html += '<th>Field Name</th>';
    html += '<th>Value</th>';
    html += '</tr>';
    for (i in fieldNames) {
        html += '<tr>';
        html += '<td>' + fieldNames[i] + '</td>';
        html += '<td> <input id="custom-case-new-' + fieldNames[i] + '" class="uk-input" type="text" placeholder="Input"> </td>';
        html += '</tr>';
    }

    html += '</table>';
    $('#custom-case-details').html(html);
}