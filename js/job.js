
$(function() {

     Workitem.init();

    $('#statusCombo').chosen();
    $('#project_id').chosen();
    if (action == 'edit') {
        $('select[name="runner"]').chosen({width: 'auto'});
        $('select[name="status"]').chosen({width: 'auto'});
    }
    if($("#is_bug").is ( ":checked" )) {
        $("#bug_job_id").keyup();
    }

    if (status_error) {
        openNotifyOverlay(status_error, false);    
    }
    applyPopupBehavior();
            
    $("#invite-link").click(function() {
        var msg = 
            '<label for="invite">Write comma separated list</label>' + 
            '<input id="invite" name="invite" class="form-control" />'
        Utils.emptyFormModal({
            action: './' + workitem_id,
            title: 'Invite Worklist Users',
            content: msg,
            buttons: [
                {
                    type: 'submit',
                    name: 'invite-people',
                    content: 'Invite',
                    className: 'btn-primary',
                    dismiss: false
                }
            ],
            open: function(modal) {
                var autoArgs = autocompleteMultiple('getuserslist');
                $('input[name="invite"]', modal).bind("keydown", autoArgs.bind);
                $('input[name="invite"]', modal).autocomplete(autoArgs, null);
                $('form', modal).on('submit', function(event) {
                    var name = $('input[name="invite"]', modal).val();
                    $.ajax({
                        type: "POST",
                        url: "./" + workitem_id,
                        data: "invite=" + name + "&invite-people=Invite",
                        dataType: "json",
                        success: function(json) {
                            var msg;
                            if (!json.length) {
                                msg = '<p>Invite sent to <a href="./user/' + name +'">' + name + '</a></p>';
                            } else {
                                msg = '<p>Some of the users you sent do not exist. Please correct those shown and try again.</p>';
                                for (var i = 0; i < json.length; i++) {
                                    if (i) {
                                        $('input[name="invite"]', modal).val($('input[name="invite"]', modal).val() + json[i]);
                                    } else {
                                        $('input[name="invite"]', modal).val($('input[name="invite"]', modal).val() + ',' + json[i]);
                                    }
                                }
                            }
                            Utils.emptyModal({content: msg});
                        }
                    });
                    $(modal).modal('hide');
                    return false;
                });
            }
        });
        return false;
    });

    if (displayDialogAfterDone && mechanic_id > 0) {
        WReview.displayInPopup({
            'user_id': mechanic_id,
            'nickname': mechanic_nickname,
            'withTrust': true,
            'notify_now': 0
        });
    }

    if (user_id) {
        $.get('api.php?action=getSkills', function(data) {
            var skillsData = eval(data);
            var autoArgsSkills = autocompleteMultiple('getskills', skillsData);
            $("#skills-edit").bind("keydown", autoArgsSkills.bind);
            $("#skills-edit").autocomplete(autoArgsSkills);               
        });
    }
    makeWorkitemTooltip(".worklist-item");

    $('#workitem-form').submit(function() {
        return saveWorkitem();
    });

    //if the page was loaded with request to display userinfo automatically then do it.
    if (userinfotoshow){
        window.location.href='userinfo.php?id=' + userinfotoshow;
    }

    //lookup and show job summary on bug_job_id change
    $("#bug_job_id").keyup(function() {
        var id=$("#bug_job_id").val();
        if(id.length) {
            $.ajax({
                url: 'api.php',
                dataType: 'json',
                data: {
                    action: 'getJobInformation',
                    itemid: id
                },
                type: 'POST',
                success: function(json) {
                    if (!json || json === null) {
                        alert("json null in getjobinformation");
                        return;
                    }
                    if (json.error) {
                        alert(json.error);
                    } else {
                        if(json.returnString.length > 0) {
                            $('#bugJobSummary').attr('title', id);
                        } else {
                            $('#bugJobSummary').attr('title', 0);
                        }
                    }
                }
            });
        }
    });

    Entries.formatWorklistStatus();
});

var Workitem = {

    sandbox_url: '',
    
    init: function() {
        $("#view-sandbox").click(function() {
            if (repo_type == 'git') {
                window.open(sandbox_url, '_blank');
            } else {
                Workitem.openDiffPopup({
                    sandbox_url: sandbox_url,
                    workitem_id: workitem_id
                });
            }
        });       
    },
    
    openDiffPopup: function(options) {
        if ($("#diffUrlDialog").length == 0) {
            $("<div id='diffUrlDialog' class='popup-body'><div class='content'>Loading ...</div></div>").appendTo("body"); 
            $("#diffUrlDialog").data("options", options);
            $('#diffUrlDialog').dialog({
                dialogClass: 'white-theme',
                title: 'View Sandbox Diff',
                autoOpen: false,
                closeOnEscape: true,
                resizable: false,
                width: '420px',
                show: 'drop',
                hide: 'drop',
                buttons: [
                    {
                        text: 'Ok',
                        click: function() {
                            if ($("#diffUrlDialog #diff-sandbox-url").length > 0) {
                                $("#diffUrlDialog").data("options", {
                                    sandbox_url: $("#diffUrlDialog #diff-sandbox-url").val(),
                                    workitem_id: $("#diffUrlDialog").data("options").workitem_id
                                });
                                Workitem.fillDiffPopup();
                            } else {
                                $(this).dialog("close");
                            }                           
                        }
                    }
                ],
                open: function() {
                    Workitem.fillDiffPopup();
                },
                close: function() {
                    $("#diffUrlDialog .content").html("");
                }
            });
        } else {
            $("#diffUrlDialog").data("options", options);
            $("#diffUrlDialog .content").html("");                       
        }
        $("#diffUrlDialog").dialog("open");
    },
    
    fillDiffPopup: function() {
        var options = $("#diffUrlDialog").data("options");
        $("#diffUrlDialog .content").load("api.php #urlContent", {
            action: 'workitemSandbox',
            method: 'getDiffUrlView',
            sandbox_url: options.sandbox_url,
            workitem_id: options.workitem_id
        });        
    }
    
    
}

function reply(id) {
    var commentForm = $('#commentform');
    var clone = commentForm.clone();
    commentForm.remove();
    clone.insertAfter($('#comment-' + id));
    $('#commentform textarea').height(61).autosize();
    commentMargin = $('#comment-' + id).css('margin-left');
    leftMargin = 64 + "px";
    clone.css({'margin-left':leftMargin});
    $('#commentform input[name=comment_id]').val(id);
    $('#commentform input[name=newcomment]').val('Reply');
    $('#commentform input[name=cancel]').removeClass('hidden');

    $('#commentform input[name=cancel]').click(function(event) {
        event.preventDefault();
        var commentForm = $('#commentform');
        var clone = commentForm.clone();
        commentForm.remove();
        clone.css({'margin-left':'0'});
        $('input[name=cancel]', clone).addClass('hidden');
        clone.insertAfter($('#commentZone ul'));
        $('#commentform textarea').height(61).autosize();

        $(this).parent().addClass('hidden');
        $('#commentform input[name=newcomment]').val('Comment');
        $('#commentform input[name=comment_id]').val('');
        $('#commentform input[name=newcomment]').click(function(event) {
            event.preventDefault();
            postComment();
        });
    });

    $('#commentform input[name=newcomment]').click(function(event) {
        event.preventDefault();
        postComment();
    });

    runDisableable();
    return false;
}

function postComment() {
    var id = $('#commentform input[name=comment_id]').val();
    var my_comment = $('#commentform textarea[name=comment]').val();

    var color = 'imOdd';
    $('#commentform textarea[name=comment]').val('');
    $('#commentform input[name=comment_id]').val('');
    $('#commentform input[name=newcomment]').val('Comment');
    $('#commentform input[name=cancel]').addClass('hidden');
    $('#commentform').css({'margin-left':0});
    var commentForm = $('#commentform');
    var clone = commentForm.clone();
    commentForm.remove();

    $.ajax({
        type: 'post',
        url: './' + workitem_id,
        data: {
            job_id: workitem_id,
            worklist_id: workitem_id,
            user_id: user_id,
            newcomment: '1',
            comment: my_comment,
            comment_id: id
        },
        dataType: 'json',
        success: function(data) {
            var depth;
            var elementClass;
            if (data.success) {
                $('#no_comments').hide();
                if (id != '') {
                    elementClass = $('#comment-' + id).attr('class').split(" ");
                    depth = Number(elementClass[0].substring(elementClass[0].indexOf('-') + 1)) + 1;
                } else {
                    depth = 0;
                }
                var replyLink = (depth < 6) ? '<div class="reply-lnk">' +
                        '<a href="#commentform" onClick="reply(' + data.id + '); return false;">Reply</a>' +
                    '</div>' : '';
                var newcomment =
                    '<li id="comment-' + data.id + '" class="depth-' + depth + ' ' + color + '">' +
                        '<div class="comment">' +
                            '<a href="./user/' + data.userid + '" >' +
                                '<img class="picture profile-link" src="' + data.avatar + '" title="Profile Picture - ' + data.nickname + '" />' +
                            '</a>' +
                            '<div class="comment-container">' +
                                '<div class="comment-info">' +
                                    '<a class="author profile-link" href="./user/' + data.userid +'" >' +
                                        data.nickname +
                                    '</a> ' +
                                    '<span class="date">' +
                                        data.date +
                                    '</span>' +
                                '</div>' +
                                '<div class="comment-text">' +
                                     data.comment +
                                '</div>' +
                                '<div class="reply-lnk">' +
                                    replyLink +
                                '</div>' +
                            '</div>' +
                        '</div>'
                     '</li>';

                if (id == '') {
                    $('#commentZone ul').append(newcomment);
                } else {
                    var cond = new Array();
                    var depthtmp = depth -1;
                    while (depthtmp > -1) {
                        cond.push('li[class*="depth-' + (depthtmp) + '"]');
                        depthtmp--;
                    }
                    $(newcomment).insertAfter($('#comment-' + id).nextUntil(cond.join(',')).andSelf().filter(":last"));
                }
            }

            clone.insertAfter($('#commentZone ul'));
            $('#commentform textarea').height(61).autosize();
            $('#commentform input[name=newcomment]').click(function(event) {
                event.preventDefault();
                postComment();
            });
        }
    });
}

$(document).ready(function(){

    // default dialog options
    var dialog_options = { dialogClass: 'white-theme', autoOpen: false, modal: true, maxWidth: 600, width: 485, show: 'fade', hide: 'fade', resizable: false };
    $('#popup-bid').dialog(dialog_options);
    $('#popup-review-started').dialog(dialog_options);

    $('#popup-ineligible').dialog({
        dialogClass: 'white-theme',
        modal: true,
        title: "Your account is ineligible",
        autoOpen: false,
        width: 300,
        position: ['top'],
        open: function() {
            $('#button_settings').click(function() {
                document.location.href = './settings#payment-info';
            });
        }
    });

    $('#popup-startreview').dialog({
        closeOnEscape: false,
        dialogClass: 'white-theme',
        autoOpen: false,
        modal: false,
        width: 400,
        show: 'fade',
        hide: 'fade',
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close").hide();
        }
    });
    $('#popup-paid').dialog({ dialogClass: 'white-theme', autoOpen: false, maxWidth: 600, width: 450, show: 'fade', hide: 'fade' });
    $('#message').dialog({ dialogClass: 'white-theme', autoOpen: true, show: 'fade', hide: 'fade' });
    $('#popup-pingtask').dialog({
        autoOpen: false,
        dialogClass: 'white-theme',
        width: 400,
        height: "auto",
        resizable: false,
        position: [ 'top' ],
        show: 'fade',
        hide: 'fade',
        close: function() {
            $('#ping-msg').val('').css("height", "100px");
        }
    });
    $('#ping-msg').autogrow();
    $('#popup-reviewurl').dialog({
        autoOpen: false,
        dialogClass: 'white-theme',
        modal: true,
        width: 450,
        show: 'fade',
        hide: 'fade',
        resizable: false,
        close: function() {
            $('select[name=quick-status]').val(origStatus);
        }
    });
    if (mechanic_id == user_id) {
        $('#popup-addtip').dialog({ dialogClass: 'white-theme', autoOpen: false, modal: true, width: 365, height: 385, show: 'fade', hide: 'fade' });
        $('.addTip').click(function() {
            $('#popup-addtip').dialog('open');
        });
    }

   $('#commentform input[name=newcomment]').click(function(event) {
        event.preventDefault();
        postComment();
    });
    
    $('#commentform input[name=cancel]').addClass('hidden');

    $("#switchmode_edit").click(function(event) {
        if (!is_project_runner && insufficientRightsToEdit) {
                 $("#workitem_no_edit").dialog({
                     title: "Insufficient User Rights",
                     autoOpen: false,
                     height: 120,
                     width: 370,
                     position: ['center','center'],
                     modal: true
            });
            $("#workitem_no_edit").dialog("open");
            event.preventDefault();
        }
    });
    $('#following').click(function() {
        $.ajax({
            type: 'post',
            url: 'jsonserver.php',
            data: {
                workitem: workitem_id,
                userid: user_id,
                action: 'ToggleFollowing'
            },
            dataType: 'json',
            success: function(data) {
                if (data.success) {
                    isFollowing = !isFollowing;
                    setFollowingText(isFollowing);
                }
            }
        });
    });

    (function($) {
        // journal info accordian
        // flag to say we've not loaded anything in there yet
        $.journalChat = false;
        $('.accordion').accordion({
            clearStyle: true,
            collapsible: true,
            active: true
            }
        );
        $('.accordion').accordion( "activate" , 0 );
        $.ajax({
            type: 'post',
            url: 'jsonserver.php',
            data: {
                workitem: workitem_id,
                userid: user_id,
                action: 'getFilesForWorkitem'
            },
            dataType: 'json',
            success: function(data) {
                if (data.success) {
                    var images = data.data.images;
                    var documents = data.data.documents;
                    for (var i=0; i < images.length; i++) {
                        imageArray.push(images[i].fileid);
                    }
                    for (var i=0; i < documents.length; i++) {
                        documentsArray.push(documents[i].fileid);
                    }
                    var files = $('#uploadedFiles').parseTemplate(data.data);
                    $('#uploadPanel').append(files);
                    if (user_id) {
                        $('#accordion').fileUpload({images: imageArray, documents: documentsArray});
                    }
                    $('#uploadPanel').data('files', data.data);
                    $('#accordion').bind( "accordionchangestart", function(event, ui) {
                        $('#uploadButtonDiv').appendTo(ui.newContent);
                        $('#uploadButtonDiv').css('display', 'block');
                    });
                }
            }
        });
        setTimeout(function(){
            $(".view_bid_id").click();
        }, 500);
        if (user_id) {
            setFollowingText(isFollowing);
        } else {  
            $('#followingLogin').html('<a href="./github/login">Login to follow this task.</a>');
        }
    })(jQuery);
    
    SimplePopup('#popup-bid', 'Place Bid', workitem_id, [['input', 'itemid', 'keyId', 'eval']]);
    $('.popup-body form input[type="submit"]').click(function(){
        var name = $(this).attr('name');
        switch(name) {
            case "reset":
                ResetPopup();
                return false;
            case "cancel":
                $('#popup-paid').dialog('close');
                return false;
         }
    });
    if (user_id) {
        $('.paid-link').click(function(e){
            e.stopPropagation();
            var fee_id = $(this).attr('id').substr(8);
            if ($('#feeitem-' + fee_id).html() == "Yes") {
                $('#paid_check').attr('checked', "1");
            } else if ($('#feeitem-' + fee_id).html() == "No" ) {
                $('#notpaid_check').attr('checked', "1");
            }

            $('#paid_check').click(function() {
                   var $checkbox = $('#notpaid_check');
                   $checkbox.attr('checked', !$checkbox.attr('checked'));
            });
            $('#notpaid_check').click(function() {
                   var $checkbox = $('#paid_check');
                   $checkbox.attr('checked', !$checkbox.attr('checked'));
            });
            AjaxPopup('#popup-paid',
                'Pay Fee',
                'api.php?action=getFeeItem',
                fee_id,
                [ ['input', 'itemid', 'keyId', 'eval'],
                ['textarea', 'paid_notes', 'json[2]', 'eval'],
                ['checkbox', 'paid_check', 'json[1]', 'eval'] ]);
                $('.paidnotice').empty();
                $('#popup-paid').dialog('open');

                // onSubmit event handler for the form
                $('#popup-paid > form').submit(function() {
                    // now we save the payment via ajax
                    $.ajax({
                        url: 'api.php',
                        dataType: 'json',
                        data: {
                            action: 'payCheck',
                            itemid: $('#' + this.id + ' input[name=itemid]').val(),
                            paid_check: $('#' + this.id + ' input[name=paid_check]').prop('checked') ? 1 : 0,
                            paid_notes: $('#' + this.id + ' textarea[name=paid_notes]').val()
                        },
                        success: function(data) {
                            // We need to empty the notice field before we refill it
                            if (!data.success) {
                                // Failure message
                                var html = '<div style="padding: 0 0.7em; margin: 0.7em 0;" class="ui-state-error ui-corner-all">' +
                                                '<p><span style="float: left; margin-right: 0.3em;" class="ui-icon ui-icon-alert"></span>' +
                                                '<strong>Alert:</strong> ' + data.message + '</p>' +
                                            '</div>';
                                $('.paidnotice').append(html);
                                // Fire the failure event
                                $('#popup-paid > form').trigger('failure');
                            } else {
                                // Success message
                                var html = '<div style="padding: 0 0.7em; margin: 0.7em 0;" class="ui-state-highlight ui-corner-all">' +
                                                '<p><span style="float: left; margin-right: 0.3em;" class="ui-icon ui-icon-info"></span>' +
                                                '<strong>Info:</strong> ' + data.message + '</p>' +
                                            '</div>';
                                $('.paidnotice').append(html);
                                // Fire the success event
                                $('#popup-paid > form').trigger('success');
                            }
                        }
                    });

                    return false;
                });

                // Here we need to capture the event and fire a new one to the upper container
                $('#popup-paid > form').bind('success', function(e, d) {
                    $('.table-feelist tbody').empty();
                    //TODO Make this use a refresh when this page supports AJAX data refresh in future
                    location.reload();
                });

            return false;
        });

        $('.wd-link').click(function(e) {
            e.stopPropagation();
            e.preventDefault();
            var fee_id = $(this).attr('id').substr(3);
            $('#withdraw .fee_id').val(fee_id);
            $('#withdraw').submit();
        });

        $('tr.row-bidlist-live').click(function() {
            $.metadata.setType("elem", "script");
            var bidData = $(this).metadata();
            if (!bidData.id) {
                return; // row hasn't bid data attached so user isn't either bidder or runner
            }
            var showEditButton = (bidData.bidder_id == user_id) && !hasAcceptedBids,
                showWithdrawButton = showWithdrawOrDeclineButtons && (bidData.bidder_id == user_id),
                showDeclineButton = (is_project_runner || (is_admin && is_runner)) && bidData.bidder_id != user_id;
            
            Utils.modal('bidinfo', {
                job_id: workitem_id,
                current_id: userId,
                bid: bidData,
                showStatistics: showBidderStatistics,
                canAccept: showAcceptBidButton,
                canEdit: showEditButton,
                canPing: (showPingBidderButton && bidData.bidder_id != user_id),
                canWithdraw: showWithdrawButton,
                canDecline: showDeclineButton,
                open: function(modal) {
                    if (showAcceptBidButton) {
                        $.ajax({
                            url: './user/budget/' + userId,
                            dataType: 'json',
                            success: function(json) {
                                if (!json.budgets) {
                                    return;
                                }
                                for(var i = 0; i < json.budgets.length; i++) {
                                    var budget = json.budgets[i],
                                        link = $('<a>').attr({
                                            budget: budget.id,
                                            reason: budget.reason,
                                            remaining: budget.remaining
                                        });
                                    link.text(budget.reason + ' ($' + budget.remaining + ')');
                                    var item = $('<li>').append(link);
                                    $('.modal-footer .dropup ul', modal).append(item);
                                }
                                $('.modal-footer .dropup ul a', modal).click(function(event) {
                                    var budget = $(this).attr('budget');
                                    $('input[name="budget_id"]', modal).val(budget);
                                    $('button[name="accept"]', modal).html(
                                        '<span>' + $(this).attr('reason') + '</span> ' +
                                        '($' + $(this).attr('remaining') + ') ' +
                                        '<span class="caret"></span>'
                                    );
                                    if (!$('button[name="accept_bid"]', modal).length) {
                                        var confirm = $('<button>')
                                            .attr({
                                                type: 'submit',
                                                name: 'accept_bid'
                                            })
                                            .addClass('btn btn-primary')
                                            .text('Confirm Accept');
                                        $('.modal-footer', modal).append(confirm);
                                    }
                                })
                            }
                        });
                        $('button[name="accept_bid"]', modal).click(function(event) {
                            if (!$('input[name="budget_id"]', modal).val()) {
                                $('button[name="accept_bid"] + button', modal).click();
                                return false;
                            }
                        });
                    }
                    $('button[name="edit"]', modal).click(function() {
                        showBidForm(bidData)
                    });
                    $('button[name="ping_bidder"]', modal).click(function() {
                        pingBidder(bidData.id);
                    });
                    $('button[name="withdraw_bid_accept"]', modal).click(function() {
                        showWithdrawBidReason(bidData.id);
                    });
                    $('button[name="decline_bid_accept"]', modal).click(function() {
                        showDeclineBidReason(bidData.id);
                    });
                    $.ajax({
                        url: 'api.php?action=getUserStats', 
                        data: {
                            id: bidData.bidder_id,
                            project_id: project_id,
                            statstype: 'project_history'
                        },
                        dataType: 'json',
                        success: function(json) {
                            if (!json.joblist) {
                                return;
                            }
                            var html = '';
                            var project_link = '<a href="./' + project_name + '">' + project_name + '</a>';
                            if (!json.joblist.length) {
                                html = '<tr><td colspan="2">No prior jobs for '  + project_link + '</td></tr>';
                                $('.modal-body > table + .row > div:first-child tbody', modal).html(html);
                            } else {
                                for (var i = 0; i < (json.joblist.length > 3 ? 3 : json.joblist.length); i++) {
                                    job = json.joblist[i];
                                    html += 
                                        '<tr>' +
                                        '  <td><a href="./' + job.id + '">#' + job.id + '</a></td>' + 
                                        '  <td>' + job.summary + '</td>' + 
                                        '</tr>';
                                    $('.modal-body > table + .row > div:first-child tbody', modal).html(html);
                                }
                            }
                        }
                    });
                    $.ajax({
                        url: 'api.php?action=getUserStats',
                        data: {
                            id: bidData.bidder_id, 
                            statstype: 'counts'
                        },
                        dataType: 'json',
                        success: function(json) {
                            $('.modal-body > table + .row > div:last-child td:nth-child(1)', modal).html(
                                json.total_jobs + ' / ' + json.active_jobs
                            );
                            $('.modal-body > table + .row > div:last-child td:nth-child(2)', modal).html(
                                '$' + json.total_earnings + ' / $' + json.latest_earnings
                            );
                            $('.modal-body > table + .row > div:last-child td:nth-child(3)', modal).html(
                                '$' + json.bonus_total + ' / ' + json.bonus_percent
                            );
                        }
                    });
                }
            });
        });

        $('tr.row-feelist-live').click(function() {
            $.metadata.setType("elem", "script")
            var feeData = $(this).metadata();

            // row has bid data attached so user is a bidder or a runner
            // - see table creation routine
            if (feeData.id) {
                Utils.emptyModal({
                    title: 'Fee information',
                    content:
                        '<table class="table table-striped">' +
                        '  <thead>' +
                        '    <tr>' +
                        '      <th>User</th>' +
                        '      <th>Amount</th>' +
                        '      <th>Fee entered</th>' +
                        '      <th>Notes</th>' +
                        '    </tr>' +
                        '  </thead>' +
                        '  <tbody>' + 
                        '    <tr>' +
                        '      <td><a href="./user/' + feeData.user_id + '" >' + feeData.nickname + '</a></td>' +
                        '      <td>' + feeData.amount + '</td>' +
                        '      <td>' + feeData.fee_created + '</td>' +
                        '      <td>' + feeData.desc + '</td>' +
                        '    </tr>' +
                        '  </tbody>' +
                        '</table>'
                });
            }
        });

    }
        $('#bid').click(function(e){
            if ( already_bid
                && $(this).parent().find('#mechanic_id').val() == user_id
              && !confirm("You have already placed a bid, do you want to place a new one?")
            ) {
                $('#popup-bid').dialog('close');
                return false;
            }
        });

    $('select[name="quick-status"]').change(function(ev) {
        if ($(this).val() == 'Done' && budget_id == 0) {
            openNotifyOverlay("No budget has been assigned to this job.", true);
            $('.statusComboList').css('display', 'none');
            $('.statusComboList li[val=' +  origStatus + ']').click();
            return false;
        }
        if (job_status == 'Review') {
            job_status == 'Code Review';
        }
        if ($(this).val() != null && $(this).val() != job_status) {
            var html = "<span>Changing status from <strong>" + job_status + "</strong> to <strong>"
                + $(this).val() +"</strong></span>";

            if ($(this).val() == 'Functional') {
                if(mechanic_id == user_id && promptForReviewUrl) {
                $('#sandbox-url').val(sandbox_url);
                    $('#quick-status-review').val($(this).val());
                    $('#popup-reviewurl').dialog('open');
                } else {
                    openNotifyOverlay(html, false, false);
                    $('#quick-status form').submit();
                }
            } else {
                openNotifyOverlay(html, false, false);
                $('#quick-status form').submit();
            }
        }
    });

    if (showReviewUrlPopup) {
        $('#edit_review_url').click(function(e){
            $('#sandbox-url').val(sandbox_url);
            $('#popup-reviewurl').dialog('open');
        });
    }
});


function ResetPopup() {
    $('#for_edit').show();
    $('#for_view').hide();
    $('.popup-body form input[type="text"]').val('');
    $('.popup-body form select option[index=0]').prop('selected', true);
    $('.popup-body form textarea').val('');
}

function showConfirmForm(i) {
    if (GitHub.validate()) {
        Utils.emptyModal({
            content: 
                "<p>" +
                "  <strong>I agree that</strong> by adding either a bid or a fee, I accept that" +
                "  I will not be paid for this work unless " + project_owner +
                "  and the owner of this job approves payment." +
                "</p>" +
                "<p>" +
                "  Also, by clicking the 'I accept' button, I am contributing all code and work" +
                "  that I attach to this job or upload to the Worklist servers, including any and" +
                "  all intellectual property rights related thereto, whether or not I am paid." +
                "</p>" +
                "<p>" +
                "  All intellectual property and code I contribute is solely owned by " +
                "  " + project_owner + ", and I hereby make all assignments necessary " +
                "  to accomplish the foregoing." +
                "</p>",
            buttons: [
                {
                    content: 'I accept',
                    className: 'btn-primary',
                    dismiss: true
                }
            ],
            open: function(modal) {
                $('.btn-primary', modal).on('click', function() {
                    if (i == 'bid') {
                        showBidForm();
                    } else if (i == 'fee') {
                        showFeeForm();
                    }                
                });
            }
        });
    } else {
        GitHub.handleUserConnect();
    }
    return false;
}

function showIneligible(problem) {
    Utils.emptyModal({
        title: 'Your account is ineligible',
        content: 
            '<p>' +
            '    <strong>You are not eligible</strong> to bid or place ' + problem + 's on this item. ' +
            '    Please check your settings and make sure you have:' +
            '</p> ' +
            '<ul>' +
            '    <li>Verified your Paypal address</li>' +
            '    <li>Uploaded your completed <a href="http://www.irs.gov/pub/irs-pdf/fw9.pdf">W-9</a> (US citizens only)</li>' +
            '</ul>' +
            '<br/>',
        buttons: [
            {
                content: 'I accept',
                className: 'btn-primary',
                dismiss: true
            }
        ],
        close: function() {
            window.location = './settings';
        }
    });
}

function showBidForm(bid) {
    var minDoneIn = 7200, // in segs = 2 hours,
        maxDoneIn = 604800; // in segs = 7 days
    bid = typeof(bid) != "undefined" ? bid : {id: '', amount: '', notes: '', time_to_complete: minDoneIn, done_in: '2 hrs'};
    Utils.modal('bidform', {
        editBid: bid.id ? true : false,
        bid: bid,
        jobId: workitem_id,
        currentUserId: userId,
        open: function(modal) {
            $('input[name="done_in"]', modal).after($('<div>').addClass('dragdealer'));
            $('<div>').addClass('handle').text('drag').appendTo('.dragdealer', modal);
            var a = new Dragdealer($('.dragdealer', modal)[0], {
                speed: 1,
                animationCallback: function(x, y) {
                    var text = Utils.relativeTime(Math.round(x * (maxDoneIn - minDoneIn)) + minDoneIn, false, false, false, false);
                    $('.dragdealer > .handle').text(text);
                    $('input[name="done_in"]').val(text);
                }
            });
            $('form', modal).submit(function() {
                // see http://regexlib.com/REDetails.aspx?regexp_id=318
                // but without dollar sign 22-NOV-2010 <krumch>
                var regex_bid = /^(\d{1,3},?(\d{3},?)*\d{3}(\.\d{0,2})?|\d{1,3}(\.\d{0,2})?|\.\d{1,2}?)$/;
                var regex_date = /^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} (am|pm)$/;

                var bid_amount = new LiveValidation('bid_amount',{
                    insertAfterWhatNode: $('label[for="bid_amount"] + .input-group', modal)[0],
                    onlyOnSubmit: true
                });
                bid_amount.add(Validate.Presence, {
                    failureMessage: "Can't be empty!"
                });
                bid_amount.add(Validate.Format, {
                    pattern: regex_bid, 
                    failureMessage: "Invalid Input!"
                });

                var notes = new LiveValidation('notes', {onlyOnSubmit: true});
                notes.add( Validate.Presence, {failureMessage: "Can't be empty!" });
                var massValidationBid = LiveValidation.massValidate([bid_amount, notes]);
                if (!massValidationBid) {
                    return false;
                }
                return true;
            });            
        }
    });

}

function showWithdrawBidReason(bid_id) {
    var msg = 
        '<input type="hidden" name="bid_id" value="' + bid_id + '" />' +
        '<label for="withdraw_bid_reason">Why is this bid being withdrawn?</label>' + 
        '<textarea id="withdraw_bid_reason" name="withdraw_bid_reason" class="form-control"></textarea>'
    Utils.emptyFormModal({
        action: './' + workitem_id,
        content: msg,
        buttons: [
            {
                type: 'submit',
                name: 'withdraw_bid',
                content: 'Withdraw Bid',
                className: 'btn-primary',
                dismiss: false
            }
        ]
    });
    return false;
}

function showDeclineBidReason(bid_id) {
    var msg = 
        '<input type="hidden" name="bid_id" value="' + bid_id + '" />' +
        '<label for="decline_bid_reason">Why is this bid being declined?</label>' + 
        '<textarea id="decline_bid_reason" name="decline_bid_reason" class="form-control"></textarea>'
    Utils.emptyFormModal({
        action: './' + workitem_id,
        content: msg,
        buttons: [
            {
                type: 'submit',
                name: 'decline_bid',
                content: 'Decline Bid',
                className: 'btn-primary',
                dismiss: false
            }
        ]
    });
    return false;
}

function pingBidder(id) {
    ping_who = 'bidder';
    ping_bid_id = id;
    $('#echo-journal').prop('checked', false);
    $('#echo-journal-span').css('display', 'none');
    $('#send-ping-btn').val('Send Reply');
    $('#popup-pingtask form h5').html('Ping about Bid');
    $('#popup-pingtask form input[name="bidder"]').val(id);
    $('#popup-pingtask').dialog('open');
    $('#popup-pingtask').dialog('option', 'title', 'Ping about Bid');
    return false;
}

function showFeeForm() {
    $.get(
        './user/index/all',
        function(data) {
            Utils.modal('addfee', {
                job_id: workitem_id,
                users: data.users,
                current_nickname: sessionusername,
                current_id: userId,
                canFeeOthers: (is_runner || is_project_founder || is_project_runner),
                open: function() {
                    $('#mechanicFee').chosen();

                     // see http://regexlib.com/REDetails.aspx?regexp_id=318
                    // but without  dollar sign 22-NOV-2010 <krumch>
                    var regex = /^(\d{1,3},?(\d{3},?)*\d{3}(\.\d{0,2})?|\d{1,3}(\.\d{0,2})?|\.\d{1,2}?)$/;
                    var fee_amount = new LiveValidation('fee_amount', {onlyOnSubmit: true});
                        fee_amount.add(Validate.Presence, { failureMessage: "Can't be empty!" });
                        fee_amount.add(Validate.Format, { pattern: regex, failureMessage: "Invalid Input!" });

                    var fee_desc = new LiveValidation('fee_desc', {onlyOnSubmit: true});
                        fee_desc.add( Validate.Presence, { failureMessage: "Can't be empty!" });
                    $('form').submit(function() {
                        var massValidationFee = LiveValidation.massValidate([fee_amount, fee_desc]);
                        if (!massValidationFee) {
                            return false;
                        }
                        return true;
                    });
                }
            });
        },
        'json'
    );
}

function CheckCodeReviewStatus() {
  if (repo_type == 'svn') {
    $.ajax({
        type: 'post',
        url: 'api.php',
        data: {
            action: 'getCodeReviewStatus',
            workitemid: workitem_id
        },
        dataType: 'json',
        success: function(data) {

                //now check the returned data. if review has already been started show dialog
                if(data[0].code_review_started == 1 ) {
                    $('#popup-review-started').dialog('open');
                }
                else {
                    showReviewForm();
                }

        }
    });
  } else {
      showReviewForm();
  }
}

function showReviewForm() {
    $.ajax({
        type: 'post',
        url: 'jsonserver.php',
        data: {
            workitem: workitem_id,
            userid: user_id,
            action:'startCodeReview'
        },
        dataType: 'json',
        success: function(data) {
            closeNotifyOverlay();
            if (data.success) {
                $('#popup-startreview').dialog('open');
            } else {
                openNotifyOverlay(data.data);
                $("#sent-notify").css({'min-height': '80px', 'text-align': 'left'});
                setTimeout(function() {
                    window.location.reload();
                }, 1500);
            }
        },
        error: function() {
            closeNotifyOverlay();
        }
    });
    return false;
}

function showEndReviewForm() {
    $('#popup-endreview').dialog({
        dialogClass: 'white-theme',
        closeOnEscape: false,
        autoOpen: false,
        modal: false,
        width: 650,
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close").hide();
        }
    });
    $('#popup-endreview').dialog('open');
}

function saveWorkitem() {
    var massValidation;
    var bugJobId;
    if($('#is_bug').is(':checked')) {
        bugJobId = new LiveValidation('bug_job_id');
        bugJobId.add( Validate.Custom, {
            against: function(value,args){
                id = $('#bugJobSummary').attr('title');
                return (id!=0)
            },
            failureMessage: "Invalid item Id"
        });
    }
    
    var summary = new LiveValidation('summary');
    summary.add( Validate.Presence, {
        failureMessage: "Summary field can't be empty!"
    });

    var editProject = new LiveValidation('project_id');
    editProject.add( Validate.Exclusion, {
        within: [ 'select' ],
        partialMatch: true,
        failureMessage: "You have to choose a project!"
    });

    if($('#is_bug').is(':checked')) { 
        massValidation = LiveValidation.massValidate([editProject, summary, bugJobId],true);
    } else {
        massValidation = LiveValidation.massValidate([editProject,summary],true);
    }
                
    if (!massValidation) {
        // Validation failed. We use openNotifyOverlay to display messages
        var errorHtml = createMultipleNotifyHtmlMessages(LiveValidation.massValidateErrors);
        openNotifyOverlay(errorHtml, null, null, true);
        return false;
    }
    
}

function AcceptMultipleBidOpen(){
    var job_id = workitem_id;
    $.ajax({
        type: 'POST',
        url: 'api.php',
        data: {
            "action": "getMultipleBidList",
            "job_id": job_id
        },
        dataType: 'json',
        success: function(json) {
            if (!json.bids) {
                return;
            }
            Utils.modal('multiplebidinfo', {
                job_id: workitem_id,
                bids: json.bids,
                open: function(modal) {
                    $.ajax({
                        url: './user/budget/' + userId,
                        dataType: 'json',
                        success: function(json) {
                            if (!json.budgets) {
                                return;
                            }
                            for(var i = 0; i < json.budgets.length; i++) {
                                var budget = json.budgets[i],
                                    link = $('<a>').attr({
                                        budget: budget.id,
                                        reason: budget.reason,
                                        remaining: budget.remaining
                                    });
                                link.text(budget.reason + ' ($' + budget.remaining + ')');
                                var item = $('<li>').append(link);
                                $('.modal-footer .dropup ul', modal).append(item);
                            }
                            $('.modal-footer .dropup ul a', modal).click(function(event) {
                                var budget = $(this).attr('budget');
                                $('input[name="budget_id"]', modal).val(budget);
                                $('button[name="accept"]', modal).html(
                                    '<span>' + $(this).attr('reason') + '</span> ' +
                                    '($' + $(this).attr('remaining') + ') ' +
                                    '<span class="caret"></span>'
                                );
                                if (!$('button[name="accept_bid"]', modal).length) {
                                    var confirm = $('<button>')
                                        .attr({
                                            type: 'submit',
                                            name: 'accept_multiple_bid'
                                        })
                                        .addClass('btn btn-primary')
                                        .text('Confirm Accept');
                                    $('.modal-footer', modal).append(confirm);
                                }
                            })
                        }
                    });
                    $('button[name="accept_bid"]', modal).click(function(event) {
                        if (!$('input[name="budget_id"]', modal).val()) {
                            $('button[name="accept_bid"] + button', modal).click();
                            return false;
                        }
                    });
                    $('input[type="checkbox"]', modal).on('change', function() {
                        if ($(this).is(':checked')) {
                            if (!$('input[type="radio"]:checked', modal).length) {
                                $('input[type="radio"]', $(this).parent()).prop('checked', true);
                            }
                        } else {
                            $('input[type="radio"]:checked', $(this).parent()).prop('checked', false);
                        }
                    });
                    $('input[type="radio"]', modal).on('change', function() {
                        if ($(this).is(':checked')) {
                            $('input[type="checkbox"]', $(this).parent()).prop('checked', true);
                        }
                    });
                    $('form', modal).on('submit', function(event) {
                        if ($(this).find('input[type="checkbox"]:checked').length && $(this).find('input[type="radio"]:checked').length == 1) {
                            return true;
                        } else {
                            return false;
                        }
                    });
                }
            });
        }
    });
}

$(function() {
    $.loggedin = (user_id > 0);

    $(".editable").attr("title","Switch to Edit Mode").click(function() {
        window.location.href = "./" + workitem_id + "?action=edit";
    });

    // Call via Ajax to ping the user in the journal
    // and in email.
    $('#send-ping-btn').click(function()    {
        $('#send-ping-btn').attr("disabled", "disabled");
        var msg = $('#ping-msg').val();
        // if( $('#send-mail:checked').val() ) mail = 1;
        // always send email
        var mail = 1;
        var journal = $('#echo-journal').is(':checked') ? 1 : 0;
        var cc = $('#copy-me').is(':checked') ? 1 : 0;
        var data = {
            'action': 'pingTask',
            'id' : workitem_id, 
            'who' : ping_who, 
            'bid_id': ping_bid_id, 
            'msg' : msg, 
            'mail' : mail, 
            'journal' : journal, 
            'cc' : cc
        };
        $.ajax({
            type: "POST",
            url: 'api.php',
            data: data,
            dataType: 'json',
            success: function(json) {
                if (json && json.error) {
                    alert("Ping failed:" + json.error);
                } else {
                    var msg = "<span>Your message has been sent.</span>";
                    if ($('#send-ping-btn').val() == 'Send Reply') {
                        msg = "<span>Your reply has been sent.</span>";
                    }
                    Utils.emptyModal({
                        content: msg,
                        buttons: [
                            {
                                content: 'Ok',
                                className: 'btn-primary',
                                dismiss: true
                            }
                        ]
                    });
                }
                $('#popup-pingtask').dialog('close');
                $('#send-ping-btn').removeAttr("disabled");
            },
            error: function() {
                $('#send-ping-btn').removeAttr("disabled");
            }
        });
        return false;

    });
    
    $('#popup-pingtask').bind('dialogclose', function(event) {
        $("#echo-journal-span").css("display", "block");
        $("#send-ping-btn").val('Send ping');
        $('#echo-journal').prop('checked', true);
    });
    
    $('#pingMechanic').click(function() {
        if (!$.loggedin) {
            sendToLogin();
            return;
        }

        ping_who = 'mechanic';
        ping_bid_id = 0;
        $('#popup-pingtask form h5').html('Ping the Developer about the task');
        $('#popup-pingtask').dialog('open');
        $('#popup-pingtask').dialog('option', 'title', 'Ping the Developer about the task');
        return false;
    });

    $('#pingRunner').click(function() {
        if (!$.loggedin) {
            sendToLogin();
            return;
        }

        ping_who = 'runner';
        ping_bid_id = 0;
        $('#popup-pingtask form h5').html('Ping the Designer about the task');
        $('#popup-pingtask').dialog('open');
        $('#popup-pingtask').dialog('option', 'title', 'Ping the Designer about the task');
        return false;
    });

    $('#pingCreator').click(function() {
        if (!$.loggedin) {
            sendToLogin();
            return;
        }

        ping_who = 'creator';
        ping_bid_id = 0;
        $('#popup-pingtask form h5').html('Ping the Creator about the task');
        $('#popup-pingtask').dialog('open');
        $('#popup-pingtask').dialog('option', 'title', 'Ping the Creator about the task');
        return false;
    });

    $('.table-bids tbody td > a[href^="./user/"]').click(function(event) {
        event.stopPropagation();
        return true;
    });

    // Reassign runner
    if (canReassignRunner) {
        (function($) {
            if ($('#runnerBox span.runnerName') !== null) {
                $('#runnerBox span.runnerName').css({
                    'cursor': 'pointer',
                }).click(function() {
                    var shown = false;
                    $(this).parent().siblings().fadeOut(1000, function() {
                        if (shown != true) {
                            shown = true;
                            $('#runnerBox').css('width', '400px');
                            $('#runnerBox #ping-r-btn').css('display', 'none');
                            $('#runnerBox span.changeRunner').fadeIn(1000, function() {
                                $('#runnerBox span.changeRunner input[name=changerunner]').click(function() {
                                    $(this).unbind('click');
                                    var runner_id = $('#runnerBox span.changeRunner select[name=runner]').val();
                                    $.ajax({
                                        type: 'post',
                                        url: 'jsonserver.php',
                                        data: {
                                            action: 'changeRunner',
                                            // to avoid script loading error when not logged
                                            userid: user_id,
                                            runner: runner_id,
                                            workitem: workitem_id
                                        },
                                        dataType: 'json',
                                        success: function(j) {
                                            if (j.success == true) {
                                                $('#runnerBox #ping-r-btn').text(j.nickname);
                                                $('#runnerBox #ping-r-btn').attr('data-user-id', runner_id);
                                                $('#runnerBox input[name=cancel]').click();
                                            }
                                        }
                                    });
                                });
                                $('#runnerBox span.changeRunner input[name=cancel]').click(function() {
                                    $('#runnerBox span.changeRunner').fadeOut(1000, function() {
                                        $('#runnerBox span.changeRunner').css('display', 'none');
                                        $('#runnerBox').css('width', '130px');
                                        $('#runnerBox #ping-r-btn').css('display', 'block');
                                        $('#runnerBox span.runnerName').parent().siblings().fadeIn(1000);
                                    });
                                });
                            });
                        }
                    });
                });
            }
        })(jQuery);
    }

    //-- gets every element who has .iToolTip and sets it's title to values from tooltip.php
    setTimeout(MapToolTips, 800);

    return false;
});

function sendToLogin(){
    window.location = './github/login?redir=./' + workitem_id;
}

function setFollowingText(isFollowing){
    if(isFollowing == true) {
        $('#following').attr('title', 'You are currently following this job');
        $('#following').html('Un-Follow this job');
    } else {
        $('#following').attr('title', 'Click to receive updates for this job');
        $('#following').html('Follow this job');
    }
}
