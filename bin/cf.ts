#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { AframeworkStack } from '../lib/cf-stack';

const app = new cdk.App();
new AframeworkStack(app, 'AframeworkStack');
