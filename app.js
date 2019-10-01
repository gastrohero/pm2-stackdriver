const pm2 = require('pm2');
var pmx = require('pmx');
const {Logging} = require('@google-cloud/logging');
const packageJSON = require('./package');

const conf = pmx.initModule();

function formatMessage (string) {
  return string.replace(new RegExp('.*?: '), '')
}

pm2.Client.launchBus(function(err, bus) {
  if (err) {
    return console.error('PM2 Stackdriver', err);
  }

  if (!conf.pm2_stackdriver_enabled) {
    console.log('Stackdriver PM22 logoutput disabled')
    return
  }

  const config = {}

  if (!conf.pm2_stackdriver_on_google) {
    if (conf.pm2_stackdriver_projectId) {
      config.projectId = conf.pm2_stackdriver_projectId
    }

    if (conf.pm2_stackdriver_keyFile) {
      config.keyFile = conf.pm2_stackdriver_keyFile
    }
  }

  const logging = new Logging(config);


  bus.on('log:out', function(log) {

    if (log.process.name === packageJSON.name) {
      return;
    }

    // Selects the log to write to
    const logger = logging.log('pm2-info');


    // The metadata associated with the entry
    const metadata = {
      resource: {type: 'global'},
      severity: 200
    };

    // Prepares a log entry
    const entry = logger.entry(metadata, formatMessage(log.data));

    // Writes the log entry
    logger.write(entry);
  });

  bus.on('log:err', function(log) {
    if (log.process.name === packageJSON.name) {
      return;
    }

    const logger = logging.log('pm2-error');

    // The metadata associated with the entry
    const metadata = {
      resource: {type: 'global'},
      severity: 500
    };


    // Prepares a log entry
    const entry = logger.entry(metadata, formatMessage(log.data));

    // Writes the log entry
    logger.write(entry);
  });

  bus.on('close', function() {
    console.log('PM2 Stackdriver Module: Bus closed');
    pm2.disconnectBus();
  });
});
