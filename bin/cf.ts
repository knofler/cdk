#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { MediaLiveStack } from '../lib/cf-stack';

const app = new cdk.App();
new MediaLiveStack(app, 'MediaLiveStack');
