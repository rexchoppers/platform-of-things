---
layout: post
title:  "Adding Supervisord to AWS Elastic Beanstalk"
---

# Overview
Note: This article skips over a lot of technical detail on Elastic Beanstalk but is intended to show how to add Supervisord to an existing Laravel application running on AWS Elastic Beanstalk.

Whilst there are other ways to run background tasks on AWS in general, we quickly needed to add a background service to our Elastic Beanstalk Worker instances in order to unlock some of the core functionality that Laravel's Queue system provides. Previously, the jobs were being pushed from SQS in the following manner:

- Previously: SQS -> HTTP Request -> Laravel Worker (Elastic Beanstalk Worker)

This push configuration was fine for the most part, but as stated above, we needed to unlock some of the core functionality that Laravel's Queue system provides, and we really wanted to utilise all the resources (RAM, CPU) we have on our worker instances whilst being able to triple our queue throughput by running multiple workers on a single instance.

- New Setup: Laravel Worker (Elastic Beanstalk Worker) -> Pull from SQS -> Process Job

# 1: Adding Supervisord files
Add the following configuration files to your Laravel project. For example, we'll be adding them in the `bin/supervisor` directory.

Note: Please configure these files according to your own requirements. The following files are examples and may not be suitable for your use case.

**supervisord.conf**
```conf
[unix_http_server]
file=/var/run/supervisor/supervisor.sock

[supervisord]
logfile=/tmp/supervisord.log
logfile_maxbytes=50MB
logfile_backups=10
loglevel=info
pidfile=/tmp/supervisord.pid
nodaemon=false
minfds=1024
minprocs=200

[supervisorctl]
serverurl=unix:///var/run/supervisor/supervisor.sock

[include]
files = /etc/supervisor/conf.d/*.conf

[inet_http_server]
port = 9000
username = user
password = pw
```

**supervisord_laravel.conf**
```conf
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=/usr/bin/php /var/app/current/artisan queue:work
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=webapp
numprocs=3
redirect_stderr=true
stderr_logfile=/var/log/supervisor_laravel.err.log
stdout_logfile=/var/log/supervisor_laravel.out.log
stopwaitsecs=3600
```

**setup.sh**
```bash
#!/bin/bash

echo "Supervisor - starting setup"

if [ ! -f /usr/bin/supervisord ]; then
    echo "installing supervisor"
    easy_install supervisor
else
    echo "supervisor already installed"
fi

if [ ! -d /etc/supervisor ]; then
    mkdir /etc/supervisor
    echo "create supervisor directory"
fi

if [ ! -d /etc/supervisor/conf.d ]; then
    mkdir /etc/supervisor/conf.d
    echo "create supervisor configs directory"
fi

# Create directory to store Socket file
if [ ! -d /var/run/supervisor ]; then
    mkdir /var/run/supervisor
    echo "created supervisor socket directory"
fi

cat bin/supervisor/supervisord.conf > /etc/supervisor/supervisord.conf
cat bin/supervisor/supervisord.conf > /etc/supervisord.conf
cat bin/supervisor/supervisord_laravel.conf > /etc/supervisor/conf.d/supervisord_laravel.conf

if ps aux | grep "[/]usr/bin/supervisord"; then
    echo "supervisor is already running (Restart will happen after code deployment)"
else
    echo "starting supervisor"
    /usr/bin/supervisord
fi

# Re-read and update supervisor configuration
/usr/bin/supervisorctl reread
/usr/bin/supervisorctl update

echo "Supervisor Configured!"
```


# 2: Setting up Supervisord on AWS Elastic Beanstalk
Once you've added all the configuration files and adjusted them to your requirements, you'll need to add a `.ebextensions` directory to the root of your Laravel project. This will be used to store your script that will run the `setup.sh` script above

**01_supervisord.config**
```yaml
container_commands:
    install_supervisor:
        command: "bin/supervisor/setup.sh"
```

This will run the `setup.sh` script during the deployment of your Laravel application to Elastic Beanstalk.

# 3: Restarting the Supervisor service on deployment
Finally, you'll need to add a `postdeploy` hook to your Laravel project. This will restart the Supervisor service after each deployment. Originally, we had the restart in the setup.sh script, but we ended up encountering race conditions where the Supervisor service would restart before the Laravel application was fully deployed, thus not picking up the new code.

In the `.platform/hooks/postdeploy` directory, add the following configuration to restart Supervisord.

**restart_supervisord.sh**
```bash
#!/bin/bash

/usr/bin/supervisorctl restart all
echo "Supervisor Restarted"
```

# Conclusion
And that's it! You should now have Supervisord running on your Elastic Beanstalk Worker instances. You can now run multiple workers on a single instance and unlock the majority of the core functionality that Laravel's Queue system provides.

If there's anything you'd like to add or if you have any questions, feel free to reach out to me on LinkedIn or via email at [rexchoppers@gmail.com](mailto:rexchoppers@gmail.com)

# Credits
- Massive thank you to [Papertrail](https://www.papertrail.io/) for allowing me to post this article in the hope it may help others.