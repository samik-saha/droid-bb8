// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { search_wiktionary, searchWikipedia } = require('./wikidata')
const axios = require('axios');

// Turn counter property
const TURN_COUNTER_PROPERTY = 'turnCounterProperty';

// LUIS service type entry as defined in the .bot file.
const LUIS_CONFIGURATION = 'droid-bb8';

const DEFINITION_INTENT = "Definition";
const INFORMATION_INTENT = 'Information';
const GET_PROPERTY_INTENT = 'getProperty';


class MyBot {
  /**
   *
   * @param {ConversationState} conversation state object
   * @param {BotConfiguration} botConfig contents of the .bot file
   */
  constructor(conversationState, botConfig) {
    // Creates a new state accessor property.
    // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors.
    this.countProperty = conversationState.createProperty(TURN_COUNTER_PROPERTY);
    this.conversationState = conversationState;

    // Add the LUIS recognizer.
    const luisConfig = botConfig.findServiceByNameOrId(LUIS_CONFIGURATION);
    if (!luisConfig || !luisConfig.appId) throw new Error('Missing LUIS configuration.');
    this.luisRecognizer = new LuisRecognizer({
      applicationId: luisConfig.appId,
      endpoint: luisConfig.getEndpoint(),
      // CAUTION: Its better to assign and use a subscription key instead of authoring key here.
      endpointKey: luisConfig.authoringKey
    });

  }
  /**
   *
   * @param {context} on turn context object.
   */
  async onTurn(context) {
    // See https://aka.ms/about-bot-activity-message
    if (context.activity.type === ActivityTypes.Message) {
      // Perform a call to LUIS to retrieve results for the current activity message.
      const results = await this.luisRecognizer.recognize(context);
      const topIntent = LuisRecognizer.topIntent(results);

      switch (topIntent) {
        case DEFINITION_INTENT:
          //console.log(`entity: ${results.entities.headword} `);
          const headword = results.entities.headword
          await handleDefinitionRequest(headword, context)
          break;
        case INFORMATION_INTENT:
          let keyword=results.entities.keyword;
          if (keyword){
            await context.sendActivity(`Searching for information on ${keyword}`);
            let wikipedia_data = await searchWikipedia(`${keyword}`);
            if (wikipedia_data){
              await context.sendActivity(wikipedia_data.extract);
            } else{
              await context.sendActivity("Sorry! I couldn't find anything on that");
            }
          }else{
            await context.sendActivity('Sorry, I could not understand!')
          }
          break;
        case GET_PROPERTY_INTENT:
          await context.sendActivity(`Property Intent`);
          break;
        default:
          // read from state.
          let count = await this.countProperty.get(context);
          count = count === undefined ? 1 : ++count;
          await context.sendActivity(`${count}: You said "${context.activity.text}"`);
          // increment and set turn counter.
          await this.countProperty.set(context, count);
      }
    } else {
      await context.sendActivity(`[${context.activity.type} event detected]`);
    }
    // Save state changes
    await this.conversationState.saveChanges(context);
  }
}

async function handleDefinitionRequest(headword, context) {
  if (headword) {
    try {
      const response = await axios.get(`http://api.pearson.com/v2/dictionaries/wordwise/entries?headword=${headword}`);
      //console.log(JSON.stringify(response.data));
      if (response.data.results.length > 0) {
        const definition = response.data.results[0].senses[0].definition;
        await context.sendActivity(definition);
      }
    } catch (error) {
      await context.sendActivity(`Sorry! Couldn't find the definition for ${headword}`);
    }
  }
  else {
    await context.sendActivity('Sorry, I could not understand!')
  }
}

module.exports.MyBot = MyBot;