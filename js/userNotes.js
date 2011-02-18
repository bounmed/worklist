/**
 * Coffee And Power
 * Copyright (c) 2010 LoveMachine, LLc.
 * All rights reserved.
 */

var userNotes = {
    base_url: '',
    init : function(){
        $(".userNotes").live('blur',function(){
            userNotes.saveUserNotes();
        });
    },
    
    saveUserNotes: function(fAfter) {
        $.ajax({
            type: 'POST',
            url: userNotes.base_url + 'userNotes.php',
            data: { 
                action:'saveUserNotes',
                userNotes: $(".userNotes").val(),
                userId: $("#userid").val() 
            },
            dataType: 'json',
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                alert("Error in saveUserNotes. "+textStatus);
            },
            success: function(json) {
                if ((json === null) || (json.succeeded !== true)  ) {
                    var message="Error returned. ";
                    if (json !== null) {
                        message = message + json.message;
                    }
                    alert(message);
                    return;
                }
                if (fAfter) {
                    fAfter(true);
                }
            }
                                     
        });
    }

};
