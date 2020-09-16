const electron = require('electron');
const express = require('express');
const fs = require('fs');
const path = require('path');

const {app, BrowserWindow, Menu} = electron
const apps = express();
const port = 3000;

let mainWindow;

app.on('ready', ()=>{
    mainWindow = new BrowserWindow({
        
    });
    mainWindow.loadURL("http://localhost:3000/");

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('closed', function(){
        app.quit();
    });
});  

apps.use(express.static(__dirname + '/public'))
    .use(express.static(__dirname + '/invoices'))
    .use(express.static(__dirname + '/datafile'))
    .listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

apps.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/main_window.html'));
});

apps.get('/load_main_window', (req, res) => {
    res.sendFile(path.join(__dirname + '/load_main_window.html'));
});

apps.get('/get_generated_invoices_page', (req, res) => {
    res.sendFile(path.join(__dirname + '/invoice_list.html'));
});

apps.get('/get_enter_invoice_data', (req, res) => {
    res.sendFile(path.join(__dirname + '/enter_invoice_data.html'));
});

apps.get('/save_invoice_data', (req, res) => {
    var newDoc = req.query.newdoc;
    var datafilePath = path.join(__dirname, 'datafile/datafile');
    var Datastore = require('nedb')
                , db = new Datastore({ filename: datafilePath, autoload: true });
    db.insert(newDoc, function (err, newDoc) {
        if(err != null){
            console.log(err);
        }else{
            res.send({"data":newDoc});
        }
    });
});

apps.get('/load_invoice_data', (req, res) => {
    var datafilePath = path.join(__dirname, 'datafile/datafile');
    var Datastore = require('nedb')
                , db = new Datastore({ filename: datafilePath, autoload: true });
    console.log("id of the selected doc:: "+req.query.id);
    db.findOne({ _id: req.query.id }, function (err, doc) {
        if(err != null){
            alert("db error, please contact admin");
        }

        console.log("loading::"+JSON.stringify(doc));
        setToSession(JSON.stringify(doc));
        res.sendFile(path.join(__dirname + '/load_invoice_data.html'));
    });
});

apps.get('/get_old_invoice_data_page', (req, res) => {
    res.sendFile(path.join(__dirname + '/old_invoice_data.html'));
});

apps.get('/get_old_invoice_data', (req, res) => {
    var datafilePath = path.join(__dirname, 'datafile/datafile');

    var Datastore = require('nedb')
                , db = new Datastore({ filename: datafilePath, autoload: true });

    db.find({}).sort({ today: -1 }).exec(function (err, docs) {
        res.send(docs);
    });
});

apps.get('/get_next_invoice_number', (req, res) => {
    var invoiceNumberFilePath = path.join(__dirname, '/datafile/invoice_number.json');
    var existingData =  fs.readFileSync(invoiceNumberFilePath, 'utf8', function(err, data){
        if (err) { 
            console.log(err);
            res.send("invoice_"+0);
        } else { 
            console.log("Reading from invoice_number json:::"+data);
        } 
    });
    console.log(parseInt(existingData)+1);
    res.send({"index":parseInt(existingData)+1});
});

apps.get('/update_invoice_number', (req, res) => {
    var invoiceNumberFilePath = path.join(__dirname, '/datafile/invoice_number.json');
    var existingData =  fs.readFileSync(invoiceNumberFilePath, 'utf8', function(err, data){

    });
    fs.writeFile(invoiceNumberFilePath, parseInt(existingData)+1, 'utf8', function(err){
        if (err) { 
            console.log(err);
        } else { 
            console.log('Invoice Number Saved Successfully');
        } 
    });
    console.log(parseInt(existingData)+1);
    res.send({"index":parseInt(existingData)+1});
});

apps.get('/get_from_session', (req, res) => {
    var sessionFilePath = path.join(__dirname, '/datafile/session.json');
    var existingData =  fs.readFileSync(sessionFilePath, 'utf8', function(err, data){
        if (err) { 
            console.log(err);
            res.send("invoice_"+0);
        } else { 
            console.log("Reading from session json:::"+data);
        } 
    });
    console.log(existingData);
    res.send({"value":existingData});
});

apps.get('/set_to_session', (req, res) => {
    var newData = req.query.value;
    var sessionFilePath = path.join(__dirname, '/datafile/session.json');
    fs.writeFile(sessionFilePath, newData, 'utf8', function(err){
        if (err) { 
            console.log(err);
        } else { 
            console.log('Session Saved Successfully');
        } 
    });
    res.send({"index":newData});
});

function setToSession(newData){
    var sessionFilePath = path.join(__dirname, '/datafile/session.json');
    fs.writeFile(sessionFilePath, newData, 'utf8', function(err){
        if (err) { 
            console.log(err);
        } else { 
            console.log('Session Saved Successfully');
        } 
    });
}

apps.get('/get_generated_invoices_list', (req, res) => {
    var pdfcreatePath = path.join(__dirname, 'invoices');

    createFolderInvoice();

    var fileList = [];
    fs.readdir(pdfcreatePath, function (err, files) {
        if (err) {
            console.log('Unable to scan directory: ' + err);
            return false;
        } 
        files.reverse().forEach(function (file) {
          var filemetadata = fs.statSync(path.join(pdfcreatePath, file));
          fileList.push({
            "file":file,
            "created_time":filemetadata.birthtime.toString().slice(0,-30),
            "file_size":filemetadata.size
          });
        });
        console.log("===="+fileList);
        res.send(fileList);
    });
});

var options = { 
    marginsType: 0, 
    pageSize: 'A4', 
    printBackground: true, 
    printSelectionOnly: false, 
    landscape: false
} 

var options2 = { 
    silent: false, 
    printBackground: true, 
    color: false, 
    margin: { 
        marginType: 'printableArea'
    }, 
    landscape: false, 
    pagesPerSheet: 1, 
    collate: false, 
    copies: 1, 
    header: 'Header of the Page', 
    footer: 'Footer of the Page'
} 

function craetePDF(){
    var pdfcreatePath = path.join(__dirname, 'invoices/'+getNextInvoiceNumber()+'.pdf');

    console.log("pdf creating...");

    mainWindow.loadURL("http://localhost:3000/"+getNextInvoiceNumber()+'.pdf');

    mainWindow.webContents.on('did-finish-load', () => { 
        mainWindow.webContents.print(options2, (success, failureReason) => { 
            if (!success) console.log(failureReason); 
            console.log('Print Initiated'); 
        }); 
    });

    mainWindow.webContents.printToPDF(options).then(data => { 
        fs.writeFile(pdfcreatePath, data, function (err) { 
            if (err) { 
                console.log(err);
            } else {
                console.log('PDF Generated Successfully on ::'+pdfcreatePath); 
                mainWindow.loadURL("http://localhost:3000/"+getNextInvoiceNumber()+'.pdf');
            } 
        }); 
    }).catch(error => { 
        console.log(error) 
    });
}

function getNextInvoiceNumber(){
    var invoiceNumberFilePath = path.join(__dirname, '/datafile/invoice_number.json');
    var existingData =  fs.readFileSync(invoiceNumberFilePath, 'utf8', function(err, data){
        if (err) { 
            console.log(err);
            res.send("invoice_"+0);
        } else { 
            console.log("Reading from invoice_number json:::"+data);
        } 
    });
    console.log(parseInt(existingData)+1);
    return "invoice_"+parseInt(existingData)+1;
}

function createFolderInvoice(){
    var pdfcreatePath = path.join(__dirname, 'invoices');
    if(!fs.existsSync(pdfcreatePath)){
        fs.mkdirSync(pdfcreatePath);
    }
}

const mainMenuTemplate = [
    {
        label:'File', 
        submenu:[
            {
                label:'Generate PDF',
                click(){
                    craetePDF();
                }
            },
            {
                label:'Generated Invoice History',
                click(){
                    mainWindow.loadURL("http://localhost:3000/get_generated_invoices_page");
                }
            },
            {
                label:'Invoice Data',
                click(){
                    mainWindow.loadURL("http://localhost:3000/get_old_invoice_data_page");
                }
            },
            {
                label:'Enter Data',
                click(){
                    mainWindow.loadURL("http://localhost:3000/get_enter_invoice_data");
                }
            },
            {
                label:'Quit',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click(){
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'Developer Tools',
        submenu:[
            {
            role: 'reload'
            },
            {
            label: 'Toggle DevTools',
            accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
            click(item, focusedWindow){
                focusedWindow.toggleDevTools();
            }
            }
        ]
    }
];

