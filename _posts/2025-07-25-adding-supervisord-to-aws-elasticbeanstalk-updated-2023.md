---
layout: post
title:  "Adding Supervisord to AWS Elastic Beanstalk (Updated for Amazon Linux 2023)"
---

* TOC
{:toc}

# Overview
A year ago, I wrote a blog post on how to add Supervisord to AWS Elastic Beanstalk Worker instances (Post can be found [here]({{ '/2024/02/07/adding-supervisord-to-aws-elasticbeanstalk/' | relative_url }})). This was on an older version of Amazon Linux, and since then, AWS has released a new version called Amazon Linux 2023. This post will cover how to set up Supervisord on the new Amazon Linux 2023.

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
set -e

echo "Supervisor - starting setup"

# Install Supervisor if not available
if ! command -v supervisord &> /dev/null; then
    echo "Installing supervisor..."
    pip3 install supervisor
else
    echo "Supervisor already installed"
fi

# Get path to supervisor commands
SUPERVISORD=$(which supervisord)
SUPERVISORCTL=$(which supervisorctl)

# Check paths
if [ ! -x "$SUPERVISORD" ]; then
    echo "Error: supervisord not found"
    exit 1
fi

# Create config directories
mkdir -p /etc/supervisor/conf.d
mkdir -p /var/run/supervisor

# Copy config files
cp bin/supervisor/supervisord.conf /etc/supervisord.conf
cp bin/supervisor/supervisord_laravel.conf /etc/supervisor/conf.d/supervisord_laravel.conf

# Start supervisord if not running
if ! pgrep -f "$SUPERVISORD" > /dev/null; then
    echo "Starting supervisor..."
    $SUPERVISORD -c /etc/supervisord.conf
else
    echo "Supervisor already running"
fi

# Reload configs
$SUPERVISORCTL reread
$SUPERVISORCTL update

echo "Supervisor Configured!"
```


# 2: Setting up Supervisord on AWS Elastic Beanstalk
Once you've added all the configuration files and adjusted them to your requirements, you'll need to add a `.ebextensions` directory to the root of your Laravel project. This will be used to store your script that will run the `setup.sh` script above

**01_supervisord.config**
```yaml
container_commands:
    install_supervisor:
        command: "bash bin/supervisor/setup.sh"
```

This will run the `setup.sh` script during the deployment of your Laravel application to Elastic Beanstalk.

# 3: Restarting the Supervisor service on deployment
Finally, you'll need to add a `postdeploy` hook to your Laravel project. This will restart the Supervisor service after each deployment. Originally, we had the restart in the setup.sh script, but we ended up encountering race conditions where the Supervisor service would restart before the Laravel application was fully deployed, thus not picking up the new code.

In the `.platform/hooks/postdeploy` directory, add the following configuration to restart Supervisord.

**restart_supervisord.sh**
```bash
#!/bin/bash

SUPERVISORCTL=$(which supervisorctl)

$SUPERVISORCTL restart all
echo "Supervisor Restarted"
```

# Conclusion
And that's it! You should now have Supervisord running on your Elastic Beanstalk Worker instances. You can now run multiple workers on a single instance and unlock the majority of the core functionality that Laravel's Queue system provides.

If there's anything you'd like to add or if you have any questions, feel free to reach out to me on LinkedIn or via email at [rexchoppers@gmail.com](mailto:rexchoppers@gmail.com)

# Credits
- Massive thank you to [Papertrail](https://www.papertrail.io/) for allowing me to post this article in the hope it may help others.