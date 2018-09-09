/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

const path = require('path');
const packageJson = require('../../package.json');
const debugAdapterDir = packageJson['debugAdapter']['dir'];
const cortexDebugpackageJson = require(`../../${debugAdapterDir}/extension/package.json`);

import { injectable } from 'inversify';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-common';
import { DebugAdapterContribution, DebugAdapterExecutable } from '@theia/debug/lib/node/debug-model';
import * as defaults from 'json-schema-defaults';
import * as fs from 'fs';

@injectable()
export class CortexDebugAdapterContribution implements DebugAdapterContribution {
    readonly debugType = 'cortex-debug';

    provideDebugConfigurations = [{
        type: this.debugType,
        name: 'Launch Cortex Debug',
        breakpoints: { filePatterns: ['[.]c$'] },
        cwd: '${workspaceRoot}',
        executable: './Debug/hello_world.elf',
        request: 'launch',
        servertype: 'jlink',
        device: 'R7FS5D57C'
    }];

    resolveDebugConfiguration(config: DebugConfiguration): DebugConfiguration {
        config.breakpoints = { filePatterns: ['[.]c$'] };

        if (!config.request) {
            throw new Error('Debug request type is not provided.');
        }

        switch (config.request) {
            case 'launch': this.validateLaunchConfig(config);
        }

        // Load all the defaults from the external cortex's package's json
        // this is a workaround to avoid reimplementing CortexDebugConfigurationProvider
        const debuggers: any[] = cortexDebugpackageJson.contributes.debuggers;
        const selected = debuggers.filter(e => e.type === this.debugType)[0];
        const defaultSchema = selected.configurationAttributes[config.request];
        defaultSchema.type = 'object';

        const userConfig = config;
        config = defaults(defaultSchema);
        Object.assign(config, userConfig);

        // Add in the other settings needed
        config.extensionPath = path.join(__dirname, `../../${debugAdapterDir}/extension/`);

        // load the file and encode it
        const elf = fs.readFileSync(config.executable);
        config.elf_base64 = new Buffer(elf).toString('base64');

        return config;
    }

    provideDebugAdapterExecutable(config: DebugConfiguration): DebugAdapterExecutable {
        // TODO get this from the package.json
        const program = path.join(__dirname, `../../${debugAdapterDir}/extension/out/src/gdb.js`);
        return {
            program,
            runtime: 'node'
        };
    }

    private validateLaunchConfig(config: DebugConfiguration) {
    }
}
